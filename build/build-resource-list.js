#!/usr/bin/env node
/**
 * @license
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

const walk = require('walk');
const ignore = [
  'sw.js',
  'cache-manifest.js',
  '.DS_Store',
  'home.css',
  'live.css',
  'location.css',
  'schedule.css',
  'sessions.css',
  'code-of-conduct.css'
];
const crypto = require('crypto');
const fs = require('fs');
const resourceList = [
  '/devsummit/home',
  '/devsummit/schedule',
  '/devsummit/location',
  '/devsummit/code-of-conduct',
  '/devsummit/live-day-1?partial',
  '/devsummit/live-day-2?partial',
  '/devsummit/over',
  '/devsummit/schedule/day-2'
];

const getSessionInfo = _ => {
  return new Promise((resolve, reject) => {
    const sessionInfo = [];
    fs.readFile('./static/json/sessions.json', (err, sessions) => {
      if (err) {
        return reject(err);
      }

      const sessionInfoJSON = JSON.parse(sessions);

      Object.keys(sessionInfoJSON).forEach(day => {
        Object.keys(sessionInfoJSON[day]).forEach(time => {
          const url = sessionInfoJSON[day][time].url;

          if (url) {
            sessionInfo.push(url);
          }
        });
      });

      resolve(sessionInfo);
    });
  });
};

const walkStaticFiles = _ => {
  return new Promise((resolve, reject) => {
    const walker = walk.walk('./static');
    const staticFiles = [];
    walker.on('file', (root, fileStats, next) => {
      const name = fileStats.name;
      const path = `${root}/${name}`;

      if (ignore.indexOf(name) !== -1) {
        return next();
      }

      if (path.indexOf('/vr/') !== -1 || path.indexOf('vrview') !== -1) {
        return next();
      }

      if (name.endsWith('@1x.jpg')) {
        const possibleHigherResVersion =
            root + '/' + name.replace(/@1x\.jpg/, '@1.5x.jpg');
        try {
          fs.statSync(possibleHigherResVersion);

          // Skip this, as there is a higher res version.
          return next();
        } catch (e) {
          // No worries, just keep on truckin'...
        }
      }

      root = root.replace(/^\./, '/devsummit');

      if (name.endsWith('.js') ||
          name.endsWith('.css') ||
          name.endsWith('.json')) {
        const hash = crypto
            .createHash('sha256')
            .update(fs.readFileSync(path))
            .digest('hex');

        const hashedName = name.replace(/\.(.*)$/, `.${hash}.$1`);

        staticFiles.push(`${root}/${hashedName}`);
      } else {
        staticFiles.push(`${root}/${name}`);
      }

      next();
    });

    walker.on('end', _ => resolve(staticFiles));
  });
};

Promise.all([
  getSessionInfo(),
  walkStaticFiles()
]).then(resources => {
  resourceList.push(...resources[0], ...resources[1]);

  const manifest = `const cacheManifest = ${JSON.stringify(resourceList, null, 2)}`;
  fs.writeFile('./static/scripts/cache-manifest.js', manifest);
});
