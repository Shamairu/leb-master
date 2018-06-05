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
import os
import jinja2
import webapp2
import random
import re
import json
import mimetypes
import hashlib
import filters
import datetime
from datetime import datetime
from datetime import timedelta

_SERVICE_WORKER_PATH = 'static/scripts/sw.js'
_PST_ADJUSTMENT = 25200
_BASE_URL = 'https://developer.chrome.com'

# Grab the version from the package.json.
version = None
with open('./package.json') as f:
    data = json.load(f)
    version = data["version"]

sessions = None
day1 = None
day2 = None
with open('./static/json/sessions.json') as s:
    sessions = json.load(s)
    days = sorted(sessions.keys())
    if len(days) < 2:
        # I mean, this _will_ do the job for CDS, but it's highly specific.
        raise Exception('Not enough days in sessions JSON.')

    day1 = datetime.strptime(days[0], "%Y-%m-%d") + timedelta(hours=8)
    day2 = datetime.strptime(days[1], "%Y-%m-%d") + timedelta(hours=8)

# Set up the environment.
JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True)

JINJA_ENVIRONMENT.filters["add_hash"] = filters.add_hash
JINJA_ENVIRONMENT.filters["convert_to_class"] = filters.convert_to_class
JINJA_ENVIRONMENT.filters["find_session"] = filters.find_session
JINJA_ENVIRONMENT.filters["as_pst"] = filters.as_pst
JINJA_ENVIRONMENT.filters["as_24hr"] = filters.as_24hr
JINJA_ENVIRONMENT.filters["get_keys_for_date"] = filters.get_keys_for_date
JINJA_ENVIRONMENT.filters["get_current_session"] = filters.get_current_session
JINJA_ENVIRONMENT.filters["get_next_session"] = filters.get_next_session
JINJA_ENVIRONMENT.filters["get_upcoming_sessions"] = filters.get_upcoming_sessions
JINJA_ENVIRONMENT.filters["get_conference_dates"] = filters.get_conference_dates

class MainHandler(webapp2.RequestHandler):

    def get_template_info(self, url):
        template_info = {
            "path": url,
            "mimetype": (None, None),
            # Static files can be cached for a year, since there are hashes to
            # track changes to files, and so on. And we don't cache HTML.
            "cache": "public, max-age=31536000"
        }

        # If this is not a static file, use a template.
        if re.search(r"^static/", url) is None:
            # Get the template based on the path the person is visiting.
            template = re.search(r"^([^/]+)/?", url)

            if re.search(r"/$", url):
                url = url + "index"

            # For a total non-match we're looking at the root
            if template is None:
                # Hot swap the home page based on which conference day we're
                # actually on... or not. This needs to be adjusted for PST
                # because that's the timezone for CDS.
                today = datetime.today() - timedelta(hours=7)

                if (today - day1).days < 0:
                    template_info["path"] = "sections/home.html"
                elif (today - day1).days == 0:
                    template_info["path"] = "sections/live-day-1.html"
                elif (today - day2).days == 0:
                    template_info["path"] = "sections/live-day-2.html"
                else:
                    template_info["path"] = "sections/over.html"
            elif re.search(r"sessions", url):
                template_info["path"] = "sections/schedule/session.html"
            else:
                template_info["path"] = "sections/" + url + ".html"

            # HTML files should expire immediately.
            template_info["cache"] = "private, no-cache"

        # Strip off the hash from the path we're looking for.
        template_info["path"] = re.sub(r'[a-f0-9]{64}.', '', template_info["path"])

        # Make a special exception for the Service Worker, since we serve it
        # from /devsummit/sw.js, even though the file lives elsewhere.
        if re.search("sw.js$", url) is not None:
            template_info["path"] = _SERVICE_WORKER_PATH

        template_info["mimetype"] = mimetypes.guess_type(template_info["path"])

        return template_info

    def get(self, url):
        today = datetime.today()
        is_live = ((today - day1).days == 0) or ((today - day2).days == 0)
        is_partial = self.request.get('partial', None) is not None
        debug = self.request.get('debug', None) is not None
        autoplay = self.request.get('autoplay', None) is not None
        template_info = self.get_template_info(url)
        content_type = "text/plain"
        response = {
            "code": 404,
            "content": "URL not found."
        }

        if template_info["mimetype"][0]:
            content_type = "%s; charset=utf-8" % template_info["mimetype"][0]

        try:
            template = JINJA_ENVIRONMENT.get_template(template_info["path"])
            response["code"] = 200
            response["content"] = template.render(
                is_partial=is_partial,
                version=version,
                url=url,
                autoplay=autoplay,
                is_live=is_live,
                sessions=sessions,
                debug=debug,
                base_url=_BASE_URL
            )
        except jinja2.TemplateNotFound as template_name:
            print ("Template not found: %s (requested by %s)" %
                  (str(template_name), template_info["path"]))

        # Make an ETag for the content
        etag = hashlib.sha256()
        etag.update(response["content"].encode('utf-8'))

        self.response.status = response["code"]
        self.response.headers["Content-Type"] = content_type
        self.response.headers["ETag"] = etag.hexdigest()
        self.response.headers["Cache-Control"] = template_info["cache"]
        self.response.write(response["content"])

app = webapp2.WSGIApplication([
    ('/devsummit/?(.*)', MainHandler)
], debug=True)
