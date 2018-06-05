;;(function () {
  function transitionEndPromise (elem) {
    return new Promise(function (resolve) {
      elem.addEventListener('transitionend', function h() {
        elem.removeEventListener('transitionend', h);
        resolve();
      });
    });
  }

  function rafPromise () {
    return new Promise(function (resolve) {
      requestAnimationFrame(resolve);
    });
  }

  var _container = document.createElement('div');
  _container.classList.add('masthead__vr');
  _container.id = 'vrview';

  var _masthead = document.querySelector('.masthead');

  _masthead.classList.add('animatable', 'hide-areas');
  var ift;
  transitionEndPromise(_masthead)
    .then(function () {
      _masthead.appendChild(_container);
    })
    .then(rafPromise)
    .then(rafPromise)
    .then(function () {
      _masthead.classList.remove('hide-areas');
      return transitionEndPromise(_masthead);
    })
    .then(function () {
      vrView = new VRView.Player('#vrview', {
        width: '100%',
        height: '100%',
        image: '/devsummit/static/images/vr/pano.jpg',
        is_stereo: false,
        is_autopan_off: false
      });
    });
})();
