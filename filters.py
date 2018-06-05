#!/usr/bin/env python
#
# Copyright 2016 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

import re
import hashlib
import string
from datetime import datetime
from datetime import timedelta

def convert_to_class(name):
    """Converts a section name to a CSS class.

    Args:
      name: (string) The section name.

    Returns:
      Returns a CSS class (string) of the section name.
    """
    return re.sub(r"\s", "-", name.lower())


def add_hash(path):
    """Generates a hash from a file.

    Args:
      path: (string) The path to the file to generate the hash from.

    Returns:
      Returns a hash digest (string) of the file.
    """
    blocksize = 32768
    file_hash = hashlib.sha256()
    file_path = re.sub(r'/devsummit/', './', path)

    with open(file_path) as file_to_hash:
        file_buffer = file_to_hash.read(blocksize)
        while (len(file_buffer) > 0):
            file_hash.update(file_buffer)
            file_buffer = file_to_hash.read(blocksize)

    return re.sub(r'(.*?)\.(.*)$', ("\\1.%s.\\2" % file_hash.hexdigest()), path)

def find_session(sessions_info, url):
    """Finds an individual session based off the URL.

    Args:
      url: (string) The URL to use to match the session.

    Returns:
      Returns the session info or none.
    """
    # Try and find the session info.
    day_index = 0
    sorted_date_keys = sorted(sessions_info.keys())
    date_format = "%Y-%m-%dT%H:%M:%S"

    for date in sorted_date_keys:
        day_index = day_index + 1
        day = sessions_info[date]
        for time, session in day.iteritems():
            if "url" not in session:
                continue

            if session["url"] == ('/devsummit/%s' % url):
                session["day_index"] = day_index
                session["datetime"] = datetime.strptime(("%sT%s" % (date, time)), date_format)
                return session

    return None

def as_pst(time, date):
    """Converts the datetime to a PST-centric label.

    Args:
      time: (string) The time of day in HH:MM:SS format.
      date: (string) The date in YYYY-mm-dd format.

    Returns:
      Returns the PST label.
    """
    # Try and find the session info.
    date = datetime.strptime('%sT%s' % (date, time), '%Y-%m-%dT%H:%M:%S')
    hour = date.hour
    minutes = date.minute
    meridiem = 'AM'
    if hour >= 12:
      meridiem = 'PM'

    if hour > 12:
      hour -= 12

    time = str(hour)
    if minutes is not 0:
      time += ' %s' % minutes

    return '%s %s PST' % (time, meridiem)

def as_24hr(time, include_separator=False):
    """Converts the time to a 24hr label.

    Args:
      time: (string) The time of day in HH:MM:SS format.

    Returns:
      Returns the PST label.
    """
    if include_separator:
        return time[:5]

    return re.sub(r"[^\d]", "", time)[:4]

def get_keys_for_date(sessions_info, date=None):
    if date == None:
        date = datetime.today().strftime('%Y-%m-%d')

    if date not in sessions_info:
        return []

    return sorted(sessions_info[date].keys())

def get_current_session(sessions_info):
    current_session = None

    # Adjust from UTC back to PST
    now = datetime.utcnow() - timedelta(hours=8)

    # Try and find the session info.
    for date in sessions_info.keys():
        sorted_session_keys = get_keys_for_date(sessions_info, date)

        for time in sorted_session_keys:
            dateParts = string.split(date, "-")
            timeParts = string.split(time, ":")

            session_datetime = datetime(
                int(dateParts[0]),
                int(dateParts[1]),
                int(dateParts[2]),

                int(timeParts[0]),
                int(timeParts[1]),
                int(timeParts[2])
            )

            if session_datetime < now and session_datetime.day == now.day:
                current_session = sessions_info[date][time]

    return current_session

def get_next_session(sessions_info):
    sorted_date_keys = sorted(sessions_info.keys())

    # Adjust from UTC back to PST
    now = datetime.utcnow() - timedelta(hours=8)

    for date in sorted_date_keys:
        sorted_session_keys = get_keys_for_date(sessions_info, date)

        for time in sorted_session_keys:
            dateParts = string.split(date, "-")
            timeParts = string.split(time, ":")

            session_datetime = datetime(
                int(dateParts[0]),  # Year
                int(dateParts[1]),  # Month
                int(dateParts[2]),  # Date

                int(timeParts[0]),  # Hours
                int(timeParts[1]),  # Minutes
                int(timeParts[2])   # Seconds
            )

            if session_datetime > now and session_datetime.day == now.day:
                return {
                  "datetime": session_datetime,
                  "details": sessions_info[date][time]
                }

    return {
      "datetime": None,
      "details": {}
    }


def get_upcoming_sessions(sessions_info):
    now = datetime.utcnow() - timedelta(hours=8)
    sorted_date_keys = sorted(sessions_info.keys())
    upcoming_sessions = []
    skip_first_match = True

    for date in sorted_date_keys:
        sorted_session_keys = get_keys_for_date(sessions_info)

        for time in sorted_session_keys:
            dateParts = string.split(date, "-")
            timeParts = string.split(time, ":")

            session_datetime = datetime(
                int(dateParts[0]),  # Year
                int(dateParts[1]),  # Month
                int(dateParts[2]),  # Date

                int(timeParts[0]),  # Hours
                int(timeParts[1]),  # Minutes
                int(timeParts[2])   # Seconds
            )

            if session_datetime > now and session_datetime.day == now.day:
                if skip_first_match:
                    skip_first_match = False
                    continue

                upcoming_sessions.append({
                  "datetime": session_datetime,
                  "details": sessions_info[date][time]
                })

    return upcoming_sessions

def get_conference_dates (sessions_info):
    return sorted(sessions_info.keys())
