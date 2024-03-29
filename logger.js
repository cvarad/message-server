const winston = require('winston');
const { combine, timestamp, printf } = winston.format;

function toLocalISO8601(timestamp, offset) {
    let offsetMillis = offset * 60 * 1000;
    let str = new Date(new Date(timestamp) - offsetMillis).toISOString();
    return str.slice(0, -1);
}
// Mountain Time Offset for logging in local time
const mtOffset = 360; // minutes

const logFormat = printf(({ level, message, label, timestamp }) => {
    level = level.toLocaleUpperCase();
    timestamp = toLocalISO8601(timestamp, mtOffset);
    return `${timestamp} [${label}] ${level}: ${message}`
});

let fileTransport;

exports.getLogger = (label) => {
    if (!fileTransport) {
        let offsetMillis = mtOffset * 60 * 1000;
        fileTransport = new winston.transports.File({
            filename: `logs/${new Date(new Date()-offsetMillis).toISOString().slice(0, -1)}`
        });

    }
    if (!winston.loggers.has(label)) {
        winston.loggers.add(label, {
            level: 'debug',
            format: combine(
                winston.format.label({ label }),
                timestamp(),
                logFormat
            ),
            transports: [
                // new winston.transports.Console(),
                fileTransport
            ]
        });
    }

    return winston.loggers.get(label);
}