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

const fs = require('fs');
const CleanCSS = require('clean-css');
const files = [
  'static/styles/cds.css',
  'static/styles/code-of-conduct.css',
  'static/styles/home.css',
  'static/styles/inline.css',
  'static/styles/live.css',
  'static/styles/location.css',
  'static/styles/schedule.css',
  'static/styles/sessions.css'
];
const opts = {
  keepSpecialComments: 1
};

files.forEach(f => {
  fs.writeFileSync(f, new CleanCSS(opts).minify([f]).styles, 'utf8');
});
