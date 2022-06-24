// libs used
// https://github.com/igbopie/spherov2.js
// https://github.com/suchipi/switch-joy-con

const {listConnectedJoyCons} = require("./rightJoycon")
const { Scanner } = require('spherov2.js');

const devices = listConnectedJoyCons()

const directions = {
    0x00: 0,
    0x01: 60,
    0x02: 90,
    0x03: 130,
    0x04: 180,
    0x05: 230,
    0x06: 270,
    0x07: 330
}
const SPEED = 100
const TIME = 5

async function runCode (){
    if (!devices[0]) return console.log("no Joycon detected")
    const rightJoycon = devices[0].open()

    const sphero = await Scanner.findSpheroMini();
    
    rightJoycon.on("change:analogStick", value => {
        console.log(directions[value])
        sphero.rollTime(SPEED, directions[value], TIME, []);
    })
}

runCode()