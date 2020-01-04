//
// MMM-OClock
//
// v2.0

let MAX_LIFETIME = 85;
let MSEC = 1000;  // sec to msec conversion

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
    //"year" or "age", "month", "date", "week", "day", "hour", "minute", "second"

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
    secondsUpdateInterval: 1,  // secs (integer)
    scale: 1, // convenience to scale bar dimensions (font size & nailSize should be
              // adjusted manually)

    birthYear: false,   // e.g. 1901
    birthMonth: 0,      // e.g. 1-12
    lifeExpectancy: MAX_LIFETIME, // default: 85
    linearLife: false,  // set to true to plot life linearly not logarithmically

    handConversionMap: {
      "age": "n/a",
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
      x: this.getDim('canvasWidth') / 2,
      y: this.getDim('canvasHeight') / 2
    }
    this.endMap = {}
    this.colorRange = {}
    this.config.secondsUpdateInterval = Math.max(1, Math.floor(this.config.secondsUpdateInterval))
  },

  getDim: function(dim, index) {
    if (!(dim in this.config)) throw new Error('Unkown config property in getDim(): ' + dim);
    let value = this.config[dim]
    if (typeof index !== 'undefined') value = value[index]
    return this.config.scale * value
  },

  notificationReceived: function(noti, payload, sender) {
    switch(noti) {
      case "DOM_OBJECTS_CREATED":
        this.colorTrick()
        // slight delay to make sure fonts are loaded before first draw
        setTimeout(() => this.updateView(), 1500)
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
    // update seconds if we have to
    if (this.config.hands.includes('second')) {
      clearTimeout(this.secondsTimer)
      let offset = this.getNow().milliseconds()
      this.secondsTimer = setTimeout(() => this.updateSeconds(),
        MSEC * this.config.secondsUpdateInterval - offset)
    } else {
      setTimeout(() => this.updateView(), this.getNextMinuteTick())
    }
  },

  // draw seconds hand
  updateSeconds: function(lastTick) {
    var now = this.getNow()
    var ctx = this.getCtx()
    this.secondsCfg.pros = lastTick ? 1 : this.getPros(now, this.secondsCfg.type)
    this.drawArc(ctx, this.secondsCfg)
    if (lastTick) return

    let msecs = now.milliseconds()
    let nextTick = MSEC * this.config.secondsUpdateInterval - msecs
    let timeToLastTick = MSEC * (60 - now.seconds())
    if (nextTick + msecs >= timeToLastTick - 10) {
      // ensure we always draw the 60th second line
      nextTick = timeToLastTick
      this.secondsTimer = setTimeout(() => this.updateSeconds(true), nextTick - 50)
      setTimeout(() => this.updateView(), nextTick + 200)
    } else {
      this.secondsTimer = setTimeout(() => this.updateSeconds(), nextTick)
    }
  },

  // next tick for updating for whole view (on the minute)
  getNextMinuteTick: function() {
    var now = moment()
    var nextTick = (59 - now.seconds()) * MSEC + (MSEC - now.milliseconds())
    if (nextTick <= 0) nextTick = 60 * MSEC
    return nextTick
  },

  getDom: function() {
    var wrapper = document.createElement("div")
    wrapper.id = "OCLOCK_WRAPPER"
    var canvas = document.createElement("canvas")
    canvas.width = this.getDim('canvasWidth')
    canvas.height = this.getDim('canvasHeight')
    canvas.id = "OCLOCK"
    var trick = document.createElement("div")
    trick.id = "OCLOCK_TRICK"
    trick.style.font = this.config.centerFont // prefetch fonts
    trick.innerHTML = '&nbsp;'
    wrapper.appendChild(canvas)
    wrapper.appendChild(trick)
    return wrapper
  },

  getAge: function(now) {
    let age = now.year() - this.config.birthYear
    if (this.config.birthMonth > 0 && (1 + now.month()) < this.config.birthMonth) age -= 1
    return age
  },

  getPros: function(now, hand) {
    if (hand === 'age' && this.config.birthYear) {
      let age = this.getAge(now)
      return this.config.linearLife
        ? age / this.endMap[hand]
        : Math.log(1 + age/25) / Math.log(1+this.endMap[hand]/25);
    }
    return now.format(this.config.handConversionMap[hand]) / this.endMap[hand]
  },

  getNow: function() {
    return (this.config.locale) ? moment().locale(this.config.locale) : moment()
  },

  getCtx: function() {
    if (this.ctx) return this.ctx
    this.ctx = document.getElementById("OCLOCK").getContext("2d")
    this.ctx.textAlign = "center"
    this.ctx.textBaseline = "middle"
    return this.ctx
  },

  drawFace: function() {
    var now = this.getNow()
    this.endMap = {
      "age": this.config.birthYear
        // explanation of this formula: if someone is near the end of,
        // or passed, their life expectancy, give them a few more years!
        ? Math.min(1.2*(this.config.birthYear-10), this.config.lifeExpectancy)
        : 0,
      "year": now.format("YYYY"),
      "month": 12,
      "date": now.daysInMonth(),
      "week": (this.config.handConversionMap["week"] == "W") ? now.isoWeeksInYear() : now.weeksInYear(),
      "day": 7,
      "hour": (this.config.handConversionMap["hour"] == "H") ? 24 : 12,
      "minute": 60,
      "second": 60,
    }

    var ctx = this.getCtx();
    ctx.clearRect(0, 0, this.getDim('canvasWidth'), this.getDim('canvasHeight'))
    var postArc = []
    var distance = 0
    if (this.config.centerR) {
      ctx.beginPath()
      ctx.fillStyle = this.config.centerColor
      ctx.arc(this.center.x, this.center.y, this.getDim('centerR'), 0, 2 * Math.PI)
      ctx.closePath()
      ctx.fill()
      if (this.config.centerTextFormat) {
        ctx.font= this.config.centerFont
        ctx.fillStyle = this.config.centerTextColor
        ctx.fillText(now.format(this.config.centerTextFormat), this.center.x, this.center.y)
      }

      distance = this.getDim('centerR') + this.config.space
    }
    for (var i=0; i < this.config.hands.length; i++) {
      let handWidth = this.getDim('handWidth', i)
      let hand = this.config.hands[i]
      distance +=  handWidth / 2
      var cfg = {
        index: i,
        type: hand,
        center: this.center,
        distance: distance,
        pros: this.getPros(now, hand),
        width: handWidth,
        text: (this.config.handTextFormat[i])
          ? (hand === 'age' && this.config.birthYear
              ? this.getAge(now)
              : now.format(this.config.handTextFormat[i]))
          : ""
      }
      postArc.push(this.drawArc(ctx, cfg))
      if (hand === 'second') this.secondsCfg = cfg
      distance += handWidth / 2 + this.config.space
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
    if (item.h === 'second') return
    if (this.config.useNail) {
      let nailSize = this.config.nailSize
      ctx.beginPath()
      ctx.lineWidth=1;
      ctx.fillStyle = item.c
      ctx.arc(item.x, item.y, nailSize/2, 0, 2*Math.PI)
      ctx.closePath()
      ctx.fill()

      ctx.beginPath()
      ctx.lineWidth=1;
      ctx.fillStyle = this.config.nailBgColor
      ctx.arc(item.x, item.y, nailSize/2 - 5, 0, 2*Math.PI)
      ctx.closePath()
      ctx.fill()
    }
    ctx.font= this.config.handFont
    ctx.fillStyle = (this.config.nailTextColor == "inherit") ? item.c : this.config.nailTextColor
    ctx.fillText(item.t, item.x, item.y)
  },
})
