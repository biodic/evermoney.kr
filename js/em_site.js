// ******************************************************************************** //
// * File: js/em_site.js
// * 개인정보 처리방침(privacy.html) 등 문서 페이지 공용 — 저작권 연도를 올해로.
// ******************************************************************************** //

(function () {
  'use strict';
  var year = document.querySelector('.em_footer_year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
