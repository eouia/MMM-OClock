# MMM-OClock
MagicMirror module - O-clock inspired by PolarClock

## Screenshot
![screenshot](https://github.com/eouia/MMM-OClock/blob/master/screenshot.png?raw=true)

## Install
```shell
cd ~/MagicMirror/modules
git clone https://github.com/eouia/MMM-OClock.git
```

## config.js
```javascript
{
  module: "MMM-OClock",
  position: "top_center",
  config: {}
},
```

### detailed & defaults
```javascript
{
  module: "MMM-OClock",
  position: "top_center",
  config: {
    locale: "", //default is system locale, or use like this. "de-DE"
    canvasWidth:1000,
    canvasHeight:1000,
    centerColor: "#FFFFFF",
    centerR: 50,
    centerTextFormat: "YYYY",
    centerFont: "bold 20px Roboto",
    centerTextColor:"#000000",
    hands: ["month", "date", "day", "hour", "minute", "second"],
    //available values; "year", "month", "date", "week", "day", "hour", "minute", "second"
    handType: "round", //"default", "round"
    handWidth: [40, 40, 40, 40, 40, 40, 40],
    handTextFormat: ["MMM", "Do", "ddd", "h", "m", "s"],
    handFont: "bold 16px Roboto",
    useNail: true,
    nailSize: 40,
    nailBgColor: "#000000",
    nailTextColor: "#FFFFFF", //CSS color or "inherit"
    space: 3,
    colorType: "hsv", //"static", "radiation", "transform", "hsv"
    colorTypeStatic: ["red", "orange", "yellow", "green", "blue", "purple"],
    colorTypeRadiation: ["#333333", "red"],
    colorTypeTransform: ["blue", "red"],
    colorTypeHSV: 0.25, //hsv circle start color : 0~1

    handConversionMap: { // I think you don't need to modify this.
      "year": "YYYY",
      "month": "M",
      "date": "D",
      "week": "w", // Local week of year. If you want to use ISO week of year, use "W" instead "w"
      "day": "e", // Local day of week. If you want to use ISO day of week, use "E" instead "e"
      "hour": "h", // 12H system. If you want to 24H system, use "H" instead "h"
      "minute": "m",
      "second": "s"
    }
  }
},
```
