import { PBX } from "../../src/config/pbx";

describe('CONFIG', () => {
  let port;

  it('Port connection', () => {
    port = new PBX().connect();
  });


});