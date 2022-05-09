export enum ATCmd {
  CPin = "AT+CPIN",
  CReg = "AT+CREG",
  WAIT = "WAIT",
  Hangup = "ATH",
  Operators = "AT+COPS",
  Message = "AT+CMGS",
  Call = "ATD",
  AT = "AT",
  USSD = "AT+CUSD",
  ECHOOff = "ATE0"
}

export enum ATEvents {
  CommandResult = "COMMAND_RESULT",
  Error = "ERROR",
  Ring = "RING",
  Ok = "OK",
  SMSReady = "SMS Ready",
  CallReady = "Call Ready",
  Ready = "READY"
}

export class CommandBuilder {
  private _command: string[] = [];
  result: string;

  constructor() { }

  private append(command: string) {
    this._command.push(`${command}\n`);
  }

  getValue(atCommand: ATCmd) {
    this.append(`${atCommand}?`);
    return this;
  }

  setValue(cmd: ATCmd, args: string[]) {
    this.append(`${cmd}=${args.join(',')}`);
    return this;
  }

  options(cmd: ATCmd) {
    this.append(`${cmd}=?`);
    return this;
  }

  call(cmd: ATCmd, append: string = "") {
    this.append(`${cmd}${append};`);
    return this;
  }

  build(): string[] {
    const cmd = this._command;
    this._command = [];
    return cmd;
  }

}
