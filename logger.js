const winston = require('winston');
const {combine, timestamp, printf} = winston.format;

const logFormat =  printf(({level, message, label, timestamp}) => {
    level = level.toLocaleUpperCase();
    return `${timestamp} [${label}] ${level}: ${message}`
});

exports.getConsoleLogger = (label) => {
    if (!winston.loggers.has(label)) {
        winston.loggers.add(label, {
            level: 'debug',
            format: combine(
                winston.format.label({label}),
                timestamp(),
                logFormat
            ),
            transports: [new winston.transports.Console()]
        });
    }

    return winston.loggers.get(label);
}