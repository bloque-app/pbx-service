import { SerialPort } from "serialport";
import { Readable, Transform, Writable } from "stream";
import { Cmd } from "../../core/cmd";
import { Driver, DriverStatus, SerialOptions } from "../../core/pbx";
import { ATCmd, ATEvents, CommandBuilder } from "./cmd";

export enum ActionType {
  RegExp,
  String
}

export interface ActionMatcherItem {
  type: ActionType,
  matcher: RegExp | string;
  handler_name: ATEvents;
}

interface CommandsPKG {
  commands: Cmd[],
  reject: (err: any) => void;
  resolve: (string) => void;
}

export class DriverSIM800L implements Driver {
  private port: SerialPort
  private commandQueue: Readable = new Readable({
    objectMode: true,
    read() { }
  });
  private currentCommands: Cmd[];
  private _init = false;

  constructor(public options: SerialOptions) {
    this.port = new SerialPort({ ...this.options })
  }

  static mapperActions: ActionMatcherItem[] = [
    {
      type: ActionType.RegExp,
      matcher: /\s*\+\w+:/, // test match 
      handler_name: ATEvents.CommandResult,
    },
    {
      type: ActionType.RegExp,
      matcher: /ERROR/, // test match 
      handler_name: ATEvents.Error
    },
    {
      type: ActionType.RegExp,
      matcher: /RING/, // test match 
      handler_name: ATEvents.Ring
    },
    {
      type: ActionType.RegExp,
      matcher: /OK/, // test match 
      handler_name: ATEvents.Ok
    },
    {
      type: ActionType.RegExp,
      matcher: /SMS Ready/, // test match 
      handler_name: ATEvents.SMSReady
    },
    {
      type: ActionType.RegExp,
      matcher: /Call Ready/, // test match 
      handler_name: ATEvents.CallReady
    },
    {
      type: ActionType.RegExp,
      matcher: /rdy/, // test match 
      handler_name: ATEvents.Ready,
    },
  ]

  private async sendATCall(cmd: CommandBuilder) {
    const atBuilder = () => new Promise<string>((resolve, reject) => {
      const commandsRaw = cmd.build();
      console.log(`${this.options.path}`, { commandsRaw });
      let counter = 0;

      function onError(err) {
        reject(err);
      }

      const onResult = (r) => {
        console.log(`${this.options.path}`, 'command', commandsRaw, 'R=', r);
        if (++counter == commands.length) {

          resolve(commands.map(x => x.result).join(''));
        }
      }

      const commands = commandsRaw.map(command => (<Cmd>{
        command,
        error: false,
        success: false,
        onError,
        in_progress: false,
        onResult,
        result: '',
      }));

      const command_pkg = {
        commands,
        resolve,
        reject
      };

      this.commandQueue.push(command_pkg);
    })


    return atBuilder();
  }

  private async onData(dataRaw: Buffer) {
    const event = dataRaw.toString();
    console.log(`${this.options.path}`, { event });
    const handler = DriverSIM800L.mapperActions.find(x => event.match(x.matcher));

    if (!handler) {
      console.warn("handler not found for event", event);
      return;
    }

    switch (handler.handler_name) {
      case ATEvents.CommandResult:
        this.onCommand(event);
        return;
      case ATEvents.Ok:
      case ATEvents.Error:
        this.endCommand(event);
        return;
      default:
        console.log(`${this.options.path}`, 'hello')
    }

  }

  private async _uusd() {
    const command = new CommandBuilder();
    const result = await this.sendATCall(command.setValue(ATCmd.USSD, ["1", "\"*611#\"", "15"]));
    return result;
  }

  private async _cpinReady() {
    const command = new CommandBuilder();
    const result = await this.sendATCall(command.getValue(ATCmd.CPin));
    return result;
  }

  private async _setEchoOff() {
    const command = new CommandBuilder();

    const result = await this.sendATCall(command.call(ATCmd.ECHOOff));
    return result;
  }

  private async _cops() {
    const command = new CommandBuilder();
    const result = await this.sendATCall(command.getValue(ATCmd.Operators));
    return result;
  }

  private async _creg() {
    const command = new CommandBuilder();
    const result = await this.sendATCall(command.getValue(ATCmd.CReg));
    return result;
  }

  private tryToResolve() {
    this.currentCommands.map(command => {
      if (command.success && command.result) {
        return command.onResult(command.result);
      }

      if (command.error) {
        return command.onError(command.result);
      }

      if (command.success && command.command.match(/\w+\+{0,1}\w+[\?;]/)) {
        return command.onResult(command.result)
      }
    })
  }


  private onCommand(response: string) {
    const { groups: { command_name, result } } = response.match(/\+(?<command_name>\w+):{0,1}(?<result>[\s\S]*)$/);
    const command = this.currentCommands.find(x => x.command.match(command_name));

    if (!command) {
      console.warn('answer not found command ', response);
      return;
    }

    command.result = result;

    this.tryToResolve();
  }

  async initialize(): Promise<boolean> {
    if (this._init) return true;

    let chr = "";
    const stream = new Transform({
      write(raw: Buffer, _, cb) {
        const data = raw.toString().split('').filter(x => x.charCodeAt(0) < "\xf0".charCodeAt(0)).join('');

        chr += data;
        if (chr.match(/\r\n$/)) {
          const lines = chr.split("\r\n");
          lines.map(x => this.push(x));
          chr = ""
        }
        cb();
      }
    });

    const writable = new Writable({
      objectMode: true,
      write: async (command: CommandsPKG, encoding, callback) => {
        this.currentCommands = command.commands;
        const buildPipeline = (cmd: Cmd) => new Promise<void>((resolve, reject) => {
          console.log(`${this.options.path}`, 'Current Commands:', this.currentCommands);
          console.log(`${this.options.path}`, 'sending command:', cmd);
          let error_times = 0;
          this.port.write(cmd.command);
          cmd.in_progress = true;
          const { onError, onResult } = cmd;

          cmd.onResult = (r) => {
            console.log(`${this.options.path}`, 'Result of piece', cmd);
            cmd.in_progress = false;
            clearInterval(timeoutRescuer);
            onResult(cmd.result);
            resolve();
          };

          cmd.onError = () => {
            error_times++;
            if (error_times < 2) {
              console.log(`${this.options.path}`, 'RETRY_COMMANND', error_times, 'CMD', cmd.command);
              this.port.write(cmd.command);
              return ;
            }
            cmd.in_progress = false;
            clearInterval(timeoutRescuer);
            onError();
            reject();
          }

          const timeoutRescuer = setInterval(() => cmd.onError(), 15_000);
        });

        const pipeline = this.currentCommands.map(x => () => buildPipeline(x));

        for (const item of pipeline) {
          try {
            await item();
          } catch (err) {
            console.log(`${this.options.path}`, { err });
            return callback(err);
          }

        }
        this.currentCommands = [];
        callback();
      },
    });

    await new Promise<void>((resolve, reject) => {
      this.port.on('open', () => resolve());
      this.port.on('error', reject);
    });


    this.commandQueue.pipe(writable);
    this.port.pipe(stream);
    stream.on('data', this.onData.bind(this));
    console.log(`${this.options.path}`, 'set Echo off');
    const echo = await this._setEchoOff();
    console.log(`${this.options.path}`, { echo });
    const resultCpinReady = await this._cpinReady();
    console.info('resultCpinReady', resultCpinReady);

    const resultCops = await this._cops();
    console.info('resultCops', resultCops);

    const resultCreg = await this._creg();
    console.info('resultCreg', resultCreg);

    this._init = true;
    setInterval(async () => {
      const builder = new CommandBuilder();
      // console.log(`${this.options.path}`, 'interval');

    }, 1000);
    return true
  }

  async endCommand(cmd: string) {
    console.log(`${this.options.path}`, 'END COMMAND')
    console.log(`${this.options.path}`, this.currentCommands);
    if (this.currentCommands.length == 0) {
      console.warn("RECEVIED ", cmd, "but queue is empty");
      return;
    }
    if (cmd.match(/OK/)) {
      const command = this.currentCommands.find(x => x.in_progress = true);
      command.success = true;
    } else if (cmd.match(/ERROR/)) {
      console.log(`${this.options.path}`, 'ERROR')
      const command = this.currentCommands.find(x => x.in_progress = true);
      command.error = true;
    }
    this.tryToResolve();
  }

  async status(): Promise<DriverStatus> {
    if (!this.commandQueue.isPaused) {
      return DriverStatus.BUSY;
    } else {
      return DriverStatus.FREE;
    }
  }

  async makeCall(phone: string): Promise<boolean> {
    console.log(`${this.options.path}`, 'making a call')
    const command = new CommandBuilder();
    await this.sendATCall(
      command
        .call(ATCmd.Hangup)
    );
    
    await this.sendATCall(
      command
        .call(ATCmd.Call, phone)
    );

    await new Promise<void>((r) => setTimeout(() => r(), 12000));
    await this.sendATCall(
      command
        .call(ATCmd.Hangup)
    );
    return true
  }

  async makeMessage(phone: string, content: string): Promise<boolean> {
    return true
  }
}
