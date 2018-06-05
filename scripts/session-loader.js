/*!
 *
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

export class SessionLoader {
  static getData () {
    if (SessionLoader._sessionMap) {
      return Promise.resolve(SessionLoader._sessionMap);
    }

    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('get', '{{ "/devsummit/static/json/sessions.json" | add_hash }}');
      xhr.responseType = 'json';
      xhr.onload = function () {
        // Go through and map date objects to sessions for convenience.
        var conferenceDays = xhr.response;
        var dates = Object.keys(conferenceDays);
        var sessionMap = new Map();
        var date;
        var daySessions;
        var times;
        var time;
        var dateTime;

        for (var i = 0; i < dates.length; i++) {
          date = dates[i];
          daySessions = conferenceDays[dates[i]];
          times = Object.keys(daySessions);

          for (var j = 0; j < times.length; j++) {
            time = times[j];
            dateTime = SessionLoader._dateFrom(date, time);
            sessionMap.set(dateTime, conferenceDays[date][time]);
          }
        }

        SessionLoader._sessionMap = sessionMap;
        resolve(SessionLoader._sessionMap);
      };
      xhr.onerror = reject;
      xhr.send();
    });
  }

  static toArray (sessions) {
    var sessionTimeArray = [];
    sessions.forEach(function (_, key) {
      sessionTimeArray.push(key);
    });

    return sessionTimeArray.sort(function (a, b) {
      // Sort sessions into ascending time order.
      return a.getTime() - b.getTime();
    });
  }

  static _dateFrom (date, time) {
    var dateParts = date.split('-');
    var timeParts = time.split(':');

    var parsedDate = new Date(
      Date.UTC(
        parseInt(dateParts[0], 10),     // Year
        parseInt(dateParts[1] - 1, 10), // Month
        parseInt(dateParts[2], 10),     // Date

        parseInt(timeParts[0], 10) + 8, // Hour (shifted to UTC from PST)
        parseInt(timeParts[1], 10),     // Minutes
        parseInt(timeParts[2], 10)      // Seconds
      )
    );

    return parsedDate;
  }
}
