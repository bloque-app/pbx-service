import { DriverSIM800L } from "./backend/SIM800L/driver";
import { SerialOptions } from "./core/pbx";

const options0: SerialOptions = {
  path: '/dev/ttyUSB0',
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: 'none'
};

const options1: SerialOptions = {
  path: '/dev/ttyUSB1',
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: 'none'
};

const options2: SerialOptions = {
  path: '/dev/ttyUSB2',
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: 'none'
};

const options3: SerialOptions = {
  path: '/dev/ttyUSB3',
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: 'none'
};

const options4: SerialOptions = {
  path: '/dev/ttyUSB4',
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: 'none'
};

const options5: SerialOptions = {
  path: '/dev/ttyUSB5',
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: 'none'
};

const phone = [
  "3124581131",
  "3228923036", 
  "3196874881",
  "3192645042",
  // "3208808234",
  // "3208759580",
];

(async () => {
  const driverUSB0 = new DriverSIM800L(options0)
  const driverUSB1 = new DriverSIM800L(options1)
  const driverUSB2 = new DriverSIM800L(options2)
  const driverUSB3 = new DriverSIM800L(options3)
  // const driverUSB4 = new DriverSIM800L(options4)
  // const driverUSB5 = new DriverSIM800L(options5)
  
  await Promise.all(
    [
      driverUSB0.initialize(),
      driverUSB1.initialize(),
      driverUSB2.initialize(),
      driverUSB3.initialize(),
      // driverUSB4.initialize(),
      // driverUSB5.initialize(),
    ]
  )

  let index = 0;
  console.log('+'.repeat(100), 'finished init');
  while (true) {
    console.log("calling to", index);
    await Promise.all([
      driverUSB0.makeCall(phone[(0 + index) % phone.length]).catch(x => console.log('wrong call for ', phone[(0 + index) % phone.length])),
      driverUSB1.makeCall(phone[(1 + index) % phone.length]).catch(x => console.log('wrong call for ', phone[(1 + index) % phone.length])),
      driverUSB2.makeCall(phone[(2 + index) % phone.length]).catch(x => console.log('wrong call for ', phone[(2 + index) % phone.length])),
      driverUSB3.makeCall(phone[(3 + index) % phone.length]).catch(x => console.log('wrong call for ', phone[(3 + index) % phone.length])),
      // driverUSB4.makeCall(phone[(4 + index) % phone.length]).catch(x => console.log('wrong call for ', phone[(4 + index) % phone.length])),
      // driverUSB5.makeCall(phone[(5 + index) % phone.length]).catch(x => console.log('wrong call for ', phone[(5 + index) % phone.length])),
    ])
    index++;
  }


})()

// -
// AT+CUSD=1,"*611#",15
// AT+CUSD=1,"2",15
// AT+CUSD=1,"1",15


// AT+CMGL="ALL"