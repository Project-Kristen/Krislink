// This function parse HH:mm:ss and mm:ss string to ms
function parseTimeToMS(time) {
    // first we reverse the string
    // and calculate the total seconds
    // do curr * (60 ** i) for each i

    return time.split(':').reverse().map(Number).reduce((prev, curr, i) => {
        return prev + (curr * Math.pow(60, i)) * 1000;
    });
}

function msToHHMMSS(ms) {
    if (!ms && !(ms <= 0)) return "00:00"
    var hhmmss = new Date(ms).toISOString().slice(11,19).split(":")
    if (hhmmss[0] === "00") return hhmmss.slice(1).join(":")
    else return hhmmss.join(":")
  }

module.exports = {
    parseTimeToMS,
    msToHHMMSS
}