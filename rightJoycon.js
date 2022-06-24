// stolen and modified from https://github.com/suchipi/switch-joy-con

const HID = require("node-hid");
const EventEmitter = require("events");

function listConnectedJoyCons() {
  const devices = HID.devices();
  return devices
    .filter(device => device.vendorId === 1406)
    .map(device => {
      return Object.assign({}, device, {
        open() {
          if (device.productId === 8199) {
            return new JoyCon(device.path);
          } else {
            throw new Error("Unknown Joy-Con model");
          }
        }
      });
    });
}

const Directions = {
    LEFT: 0x00,
    UP_LEFT: 0x01,
    UP: 0x02,
    UP_RIGHT: 0x03,
    RIGHT: 0x04,
    DOWN_RIGHT: 0x05,
    DOWN: 0x06,
    DOWN_LEFT: 0x07,
    NEUTRAL: 0x08
  };

const LED_VALUES = {
  ONE: 1,
  TWO: 2,
  THREE: 4,
  FOUR: 8,
  ONE_FLASH: 16,
  TWO_FLASH: 32,
  THREE_FLASH: 64,
  FOUR_FLASH: 128,
};

class JoyCon extends EventEmitter {
  constructor(path) {
    super();

    this.LED_VALUES = LED_VALUES;
    this._globalPacketNumber = 0;
    this._device = new HID.HID(path);

    this._device.on("data", (bytes) => {
      this._handleData(bytes);
    });

    this.setInputReportMode(0x3f);


    this.side = "right";
    this.Directions = Directions;

    this.buttons = {
      a: false,
      x: false,
      b: false,
      y: false,
      plus: false,
      home: false,
      sl: false,
      sr: false,
      r: false,
      zr: false,
      analogStickPress: false,
      analogStick: Directions.NEUTRAL
    };
  }

  close() {
    this._device.close();
  }

  _send(data) {
    // See https://github.com/dekuNukem/Nintendo_Switch_Reverse_Engineering/blob/master/bluetooth_hid_notes.md

    this._globalPacketNumber = (this._globalPacketNumber + 0x1) % 0x10;

    const bytes = [...data];
    bytes[1] = this._globalPacketNumber;

    this._device.write(bytes);
  }

  setPlayerLEDs(value) {
    const bytes = new Array(0x40).fill(0);
    bytes[0] = 0x01;
    bytes[10] = 0x30;
    bytes[11] = value;

    this._send(bytes);
  }

  // https://github.com/dekuNukem/Nintendo_Switch_Reverse_Engineering/blob/master/bluetooth_hid_subcommands_notes.md#subcommand-0x03-set-input-report-mode
  setInputReportMode(value) {
    const bytes = new Array(0x40).fill(0);
    bytes[0] = 0x01;
    bytes[10] = 0x03;
    bytes[11] = value;

    this._send(bytes);
  }

  // emit(...args) {
  //   console.log(...args);
  //   super.emit(...args);
  // }

  _buttonsFromInputReport3F(bytes) {
    // Implement in subclass
  }

  _handleData(bytes) {
    if (bytes[0] !== 0x3f) return;

    const nextButtons = this._buttonsFromInputReport3F(bytes);

    Object.entries(nextButtons).forEach(([name, nextValue]) => {
      const currentValue = this.buttons[name];
      if (currentValue === false && nextValue === true) {
        this.emit(`down:${name}`);
      } else if (currentValue === true && nextValue === false) {
        this.emit(`up:${name}`);
      }

      if (currentValue !== nextValue) {
        this.emit(`change:${name}`, nextValue);
      }
    });

    this.buttons = nextButtons;
    this.emit("change");
  }

  _buttonsFromInputReport3F(bytes) {
    return {
      a: Boolean(bytes[1] & 0x01),
      x: Boolean(bytes[1] & 0x02),
      b: Boolean(bytes[1] & 0x04),
      y: Boolean(bytes[1] & 0x08),

      plus: Boolean(bytes[2] & 0x02),
      home: Boolean(bytes[2] & 0x10),

      sl: Boolean(bytes[1] & 0x10),
      sr: Boolean(bytes[1] & 0x20),

      r: Boolean(bytes[2] & 0x40),
      zr: Boolean(bytes[2] & 0x80),

      analogStickPress: Boolean(bytes[2] & 0x08),
      analogStick: bytes[3]
    };
  }
}

module.exports.listConnectedJoyCons = listConnectedJoyCons;