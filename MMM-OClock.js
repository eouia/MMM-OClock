//
// MMM-OClock
//

let MAX_LIFETIME = 85;

Module.register("MMM-OClock", {
  defaults: {
    locale: "", //default is system locale, or use like this. "de-DE"
    canvasWidth:1000,
    canvasHeight:1000,
    centerColor: "#FFFFFF",
    centerR: 50,
    centerTextFormat: "YYYY",
    centerFont: "bold 20px Roboto",
    centerTextColor:"#000000",
    hands: ["month", "date", "day", "hour", "minute", "second"],
    //"year" (age), "month", "date", "week", "day", "hour", "minute", "second"

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
    colorTypeRadiation: ["#333333", "red"], //Don't use #pattern or colorName.
    colorTypeTransform: ["blue", "red"],
    colorTypeHSV: 0.25, //hsv circle start color : 0~1

    birthYear: false,  // e.g. 1901
    birthMonth: 0,    // e.g. 1-12
    lifeExpectancy: MAX_LIFETIME, // default: 85
    linearLife: false,  // set to true to plot life linearly not logarithmically

    handConversionMap: {
      "year": "YYYY",
      "month": "M",
      "date": "D",
      "week": "w", // Local week of year. If you want to use ISO week of year, use "W" instead "w"
      "day": "e", // Local day of week. If you want to use ISO day of week, use "E" instead "e"
      "hour": "h", // 12H system. If you want to 24H system, use "H" instead "h"
      "minute": "m",
      "second": "s"
    }
  },

  getScripts: function() {
    return ["moment.js"]
  },

  start: function() {
    this.center = {
      x: this.config.canvasWidth / 2,
      y: this.config.canvasHeight / 2
    }
    this.endMap = {}
    this.colorRange = {}
  },

  notificationReceived: function(noti, payload, sender) {
    switch(noti) {
      case "DOM_OBJECTS_CREATED":
        this.colorTrick()
        this.updateView()
        break
    }
  },

  colorTrick: function() {
    var s = {}
    if (this.config.colorType == "radiation") {
      s.s = this.config.colorTypeRadiation[0]
      s.e = this.config.colorTypeRadiation[1]
    } else if (this.config.colorType == "transform") {
      s.s = this.config.colorTypeTransform[0]
      s.e = this.config.colorTypeTransform[1]
    } else {
      return
    }

    var hf = document.getElementById("OCLOCK_TRICK")
    hf.style.borderColor = s.s
    hf.style.backgroundColor = s.e
    document.getElementById("")

    var cs = window.getComputedStyle(hf)
    var f1 = cs.getPropertyValue("border-color")
    var f2 = cs.getPropertyValue("background-color")
    hf.style.display = "none"

    this.colorRange = {
      start:f1.match(/\d+/g).map(Number),
      end:f2.match(/\d+/g).map(Number),
    }
  },

  updateView: function() {
    this.drawFace()
    var timer = setTimeout(()=>{
      this.updateView()
    }, 1000)
  },

  getDom: function() {
    var wrapper = document.createElement("div")
    wrapper.id = "OCLOCK_WRAPPER"
    var canvas = document.createElement("canvas")
    canvas.width = this.config.canvasWidth
    canvas.height = this.config.canvasHeight
    canvas.id = "OCLOCK"
    var trick = document.createElement("div")
    trick.id = "OCLOCK_TRICK"
    wrapper.appendChild(canvas)
    wrapper.appendChild(trick)
    return wrapper
  },

  getAge: function(now) {
    let age = now.year() - this.config.birthYear
    if (this.config.birthMonth > 0 && (1 + now.month()) < this.config.birthMonth) age -= 1
    return age
  },

  drawFace: function() {
    var getPros = (now, hand) => {
      if (hand === 'year' && this.config.birthYear) {
        let age = this.getAge(now)
        return this.config.linearLife
          ? age / this.endMap[hand]
          : Math.log(1 + age/25) / Math.log(1+this.endMap[hand]/25);
      }

      return now.format(this.config.handConversionMap[hand]) / this.endMap[hand]
    }
    var now = (this.config.locale) ? moment().locale(this.config.locale) : moment()

    this.endMap = {
      "year": this.config.birthYear
        ? Math.min(1.2*(this.config.birthYear-10), this.config.lifeExpectancy)
        : now.format("YYYY"),
      "month": 12,
      "date": now.daysInMonth(),
      "week": (this.config.handConversionMap["week"] == "W") ? now.isoWeeksInYear() : now.weeksInYear(),
      "day": 7,
      "hour": (this.config.handConversionMap["hour"] == "H") ? 24 : 12,
      "minute": 60,
      "second": 60,
    }

    var c = document.getElementById("OCLOCK")
    var ctx = c.getContext("2d")
    ctx.clearRect(0, 0, this.config.canvasWidth, this.config.canvasHeight)
    var postArc = []
    var distance = 0
    if (this.config.centerR) {
      ctx.beginPath()
      ctx.fillStyle = this.config.centerColor
      ctx.arc(this.center.x, this.center.y, this.config.centerR, 0, 2 * Math.PI)
      ctx.closePath()
      ctx.fill()
      if (this.config.centerTextFormat) {
        ctx.font= this.config.centerFont
        ctx.fillStyle = this.config.centerTextColor
        ctx.fillText(now.format(this.config.centerTextFormat), this.center.x, this.center.y)
      }

      distance = this.config.centerR + this.config.space
    }
    for (var i=0; i < this.config.hands.length; i++) {
      distance += this.config.handWidth[i] / 2
      var hand = this.config.hands[i]
      var cfg = {
        index: i,
        type: hand,
        center: this.center,
        distance: distance,
        pros: getPros(now, hand),
        width: this.config.handWidth[i],
        text: (this.config.handTextFormat[i]) ?
          (hand === 'year' && this.config.birthYear ?
            this.getAge(now)
            : now.format(this.config.handTextFormat[i]))
          : ""
      }
      postArc.push(this.drawArc(ctx, cfg))
      distance += this.config.handWidth[i] / 2 + this.config.space
    }
    for (var i in postArc) {
      var post = postArc[i]
      this.drawPost(ctx, post)
    }
  },

  drawArc: function(ctx, cfg) {
    var progress = function (pro) {
      var r
      if (pro < 0.25) {
        r = (pro * 2) + 1.5
      } else if (pro < 1) {
        r = (pro * 2) - 0.5
      } else if (pro == 1) {
        r = 3.5
      }
      return r * Math.PI
    }

    var startPoint = {
      x : cfg.center.x,
      y : cfg.center.y - cfg.distance
    }

    var radian = progress(cfg.pros)
    var rad0 = 1.5 * Math.PI

    color = this.getColor(cfg.index, cfg.pros)
    ctx.fillStyle = color
    ctx.strokeStyle = color

    var sX = cfg.center.x + (Math.cos(radian) * cfg.distance)
    var sY = cfg.center.y + (Math.sin(radian) * cfg.distance)

    if (this.config.handType == "round") {
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(startPoint.x, startPoint.y, (cfg.width / 2), 0, 2 * Math.PI)
      ctx.closePath()
      ctx.fill()

      ctx.beginPath()
      ctx.arc(sX, sY, (cfg.width / 2), 0, 2 * Math.PI)
      ctx.closePath()
      ctx.fill()
    }
    ctx.beginPath()
    ctx.lineWidth = cfg.width;
    ctx.arc(cfg.center.x, cfg.center.y, cfg.distance, rad0, radian)
    //ctx.arc(cntX, cntY, distance, rad0, 3.5*Math.PI,)
    ctx.stroke()
    return {x:sX, y:sY, c:color, h:cfg.type, t:cfg.text}
  },

  getColor: function(index, pros) {
    var hsv = function (h, s, v) {
      var r, g, b, i, f, p, q, t
      if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h
      }
      i = Math.floor(h * 6)
      f = h * 6 - i
      p = v * (1 - s)
      q = v * (1 - f * s)
      t = v * (1 - (1 - f) * s)
      switch (i % 6) {
        case 0: r = v, g = t, b = p; break
        case 1: r = q, g = v, b = p; break
        case 2: r = p, g = v, b = t; break
        case 3: r = p, g = q, b = v; break
        case 4: r = t, g = p, b = v; break
        case 5: r = v, g = p, b = q; break
      }
      return "rgb(" + Math.round(r * 255) + "," + Math.round(g * 255) + "," + Math.round(b * 255) + ")"
    }
    switch(this.config.colorType) {
      case "hsv":
        var p = pros + this.config.colorTypeHSV
        if (p > 1) {
          p = p - 1
        }
        return hsv(p, 1, 1)
      case "static":
        return this.config.colorTypeStatic[index]
      case "radiation":
        var n = this.config.hands.length
        var rgb = []
        for (var i = 0; i < 3; i++) {
          var s = this.colorRange.start[i]
          var e = this.colorRange.end[i]

          rgb.push(Math.round(s + ((e - s) / n * index)))
        }
        return "rgb(" + rgb.join() + ")"

      case "transform":
        var n = 1
        var rgb = []
        for (var i = 0; i < 3; i++) {
          var s = this.colorRange.start[i]
          var e = this.colorRange.end[i]
          rgb.push(Math.round(s + ((e - s) / n * pros)))
        }
        return "rgb(" + rgb.join() + ")"
    }
  },

  drawPost: function(ctx, item) {
      if (this.config.useNail) {
        ctx.beginPath()
        ctx.lineWidth=1;
        ctx.fillStyle = item.c
        ctx.arc(item.x, item.y, (this.config.nailSize/2), 0, 2*Math.PI)
        ctx.closePath()
        ctx.fill()

        ctx.beginPath()
        ctx.lineWidth=1;
        ctx.fillStyle = this.config.nailBgColor
        ctx.arc(item.x, item.y, (this.config.nailSize/2) - 5, 0, 2*Math.PI)
        ctx.closePath()
        ctx.fill()
      }


        ctx.font= this.config.handFont
        ctx.textAlign="center"
        ctx.textBaseline = "middle"
        ctx.fillStyle = (this.config.nailTextColor == "inherit") ? item.c : this.config.nailTextColor
        ctx.fillText(item.t, item.x, item.y)
  },
})
