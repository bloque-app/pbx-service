import { SerialPort } from "serialport";

export interface Operator {
  stat: string;
  oper: string;
  mode: string;
  format: string;
}

export interface SerialOptions {
  path: string,
  baudRate: number;
  dataBits: 5 | 6 | 7 | 8,
  stopBits: 1 | 1.5 | 2;
  parity: 'none' | 'odd' | 'even';
}

export enum DriverStatus {
  FREE,
  BUSY,
  ERROR,
}

export interface PayloadCall {
  phone: string;
  callbackURI: string;
}

export interface PayloadMessage extends PayloadCall {
  content: string;
}

export interface Service {
  driver: Driver;

  makeCall(payload: PayloadCall): Promise<boolean>;
  makeMessage(payload: PayloadMessage): Promise<boolean>;
}

export interface Driver {
  initialize(): Promise<boolean>;
  status(): Promise<DriverStatus>;
  makeCall(phone: string): Promise<boolean>;
  makeMessage(phone: string, content: string): Promise<boolean>;
}
