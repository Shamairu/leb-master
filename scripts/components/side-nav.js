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

export class SideNav {
  static init () {
    this.windowWidth = window.innerWidth;

    var menu = document.querySelector('.menu');
    var toggle = menu.querySelector('#menu__toggle');
    menu.classList.add('menu--enhanced');
    SideNav.checkInert();

    toggle.addEventListener('change', function () {
      SideNav.checkInert();
    });

    menu.addEventListener('keydown', SideNav.trapTabKey);

    window.addEventListener('resize', function () {
      SideNav.windowWidth = window.innerWidth;
      SideNav.checkInert();
    });
  }

  static checkInert () {
    var menu = document.querySelector('.menu');
    var menuNav = menu.querySelector('.menu__nav');
    var toggle = menu.querySelector('#menu__toggle');
    var isInert = !toggle.checked && (SideNav.windowWidth < 424);

    if (menuNav.hasAttribute('inert')) {
      menuNav.inert = isInert;
    } else if (isInert) {
      menuNav.setAttribute('inert', true);
    }
  }

  static trapTabKey (evt) {
    var menu = document.querySelector('.menu');
    var firstTabStop = menu.querySelector('#menu__toggle');
    var menuNav = menu.querySelector('.menu__nav');
    var lastTabStop = menuNav.querySelector('.menu__nav div:last-of-type a');

    if (menuNav.hasAttribute('inert')) {
      return;
    }

    // Check for TAB key press
    if (evt.keyCode === 9) {
      // SHIFT + TAB
      if (evt.shiftKey) {
        if (document.activeElement === firstTabStop) {
          evt.preventDefault();
          lastTabStop.focus();
        }
      // TAB
      } else if (document.activeElement === lastTabStop) {
        evt.preventDefault();
        firstTabStop.focus();
      }
    }

    // ESCAPE
    if (evt.keyCode === 27) {
      SideNav.close();
      firstTabStop.focus();
    }
  }

  static close () {
    document.querySelector('#menu__toggle').checked = false;
  }
}
