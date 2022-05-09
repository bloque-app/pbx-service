import { SerialOptions, Service, Driver, PayloadCall, PayloadMessage, DriverStatus } from "../../core/pbx";
import { SerialPort } from "serialport";

export class PBXService implements Service {
  constructor(public driver: Driver) { }

  async makeCall(payload: PayloadCall): Promise<boolean> {
    return false
  }
  
  async makeMessage(payload: PayloadMessage): Promise<boolean> {
    return false
  }
}
