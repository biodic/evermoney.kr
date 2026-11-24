// ******************************************************************************** //
// * File: js/em_home.js
// * 에버머니 소개 페이지(index.html) 전용.
// *
// *   [출시하면 여기만 고친다] 아래 em_home_store_url에 스토어 주소를 넣으면 받기 버튼이 그 주소로 이동한다.
// *   비어 있는 동안에는 버튼을 눌러도 이동하지 않고 "출시를 준비하고 있습니다" 알림만 보인다.
// *   둘 다 채우면 버튼 아래의 "곧 출시됩니다" 안내 문구도 사라진다.
// ******************************************************************************** //

(function () {
  'use strict';

  var em_home_store_url = {
    ios: '', // 예: https://apps.apple.com/kr/app/id0000000000
    android: '' // 예: https://play.google.com/store/apps/details?id=…
  };

  var em_home_store_name = { ios: 'App Store', android: 'Google Play' };

  var toast = document.querySelector('.em_home_toast');
  var toast_timer = null;

  function em_home_show_toast(text) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('em_home_toast_on');
    clearTimeout(toast_timer);
    toast_timer = setTimeout(function () {
      toast.classList.remove('em_home_toast_on');
    }, 2600);
  }

  // 받기 버튼
  var all_ready = true;
  var buttons = document.querySelectorAll('.em_home_store_btn');
  Array.prototype.forEach.call(buttons, function (button) {
    var store = button.getAttribute('data-store');
    var url = em_home_store_url[store];

    if (url) {
      button.setAttribute('href', url);
      button.setAttribute('target', '_blank');
      button.setAttribute('rel', 'noopener');
      button.removeAttribute('role');
      return;
    }

    all_ready = false;
    button.addEventListener('click', function (event) {
      event.preventDefault();
      em_home_show_toast(em_home_store_name[store] + ' 출시를 준비하고 있습니다.');
    });
  });

  var status = document.querySelector('.em_home_store_status');
  if (status && all_ready) status.style.display = 'none';

  // 저작권 연도
  var year = document.querySelector('.em_home_footer_year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
