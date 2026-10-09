'use strict';

const NPC_TIME_ZONE = 'America/Sao_Paulo';
const dateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: NPC_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
});

function minutesFromTime(value) {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value || ''));
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function zonedParts(timestamp) {
    const parts = {};
    for (const part of dateTimeFormatter.formatToParts(new Date(timestamp))) {
        if (part.type !== 'literal') parts[part.type] = Number(part.value);
    }
    return parts;
}

function localDateTimeToTimestamp(year, month, day, hour, minute) {
    const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute);
    let timestamp = targetAsUtc;
    for (let attempt = 0; attempt < 4; attempt++) {
        const parts = zonedParts(timestamp);
        const representedAsUtc = Date.UTC(
            parts.year, parts.month - 1, parts.day, parts.hour, parts.minute
        );
        const difference = targetAsUtc - representedAsUtc;
        if (difference === 0) return timestamp;
        timestamp += difference;
    }
    return timestamp;
}

function isActive(window, timestamp) {
    const start = minutesFromTime(window && window.inicio);
    const end = minutesFromTime(window && window.fim);
    if (start === null || end === null || start === end) return false;
    const parts = zonedParts(timestamp);
    const currentMinute = parts.hour * 60 + parts.minute;
    return start < end
        ? currentMinute >= start && currentMinute < end
        : currentMinute >= start || currentMinute < end;
}

function activeWindowStart(window, timestamp) {
    if (!isActive(window, timestamp)) return null;
    const startMinute = minutesFromTime(window.inicio);
    const startHour = Math.floor(startMinute / 60);
    const startMinutePart = startMinute % 60;
    const parts = zonedParts(timestamp);
    let { year, month, day } = parts;
    if (startMinute > parts.hour * 60 + parts.minute) {
        const previousDay = new Date(Date.UTC(year, month - 1, day - 1));
        year = previousDay.getUTCFullYear();
        month = previousDay.getUTCMonth() + 1;
        day = previousDay.getUTCDate();
    }
    return {
        startMs: localDateTimeToTimestamp(year, month, day, startHour, startMinutePart),
        dataKey: year + '-' + String(month).padStart(2, '0') + '-' +
            String(day).padStart(2, '0')
    };
}

module.exports = {
    NPC_TIME_ZONE,
    isActive,
    activeWindowStart
};
