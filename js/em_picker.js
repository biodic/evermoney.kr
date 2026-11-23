// 에버머니 앱 전용 — Google Picker로 Drive 폴더를 고르고 결과를 앱(evermoney://)으로 돌려준다.
// 앱이 주소의 # 뒤에 액세스 토큰(t)·API 키(k)·프로젝트 번호(a)를 붙여 연다. # 뒤는 서버로 전송되지 않는다.
(function () {
  var params = new URLSearchParams(location.hash.slice(1));
  var token = params.get('t');
  var key = params.get('k');
  var appId = params.get('a');
  // 토큰이 방문 기록에 남지 않게 주소에서 지운다.
  try { history.replaceState(null, '', location.pathname); } catch (e) {}

  function status(text) {
    var el = document.getElementById('em_picker_status');
    if (el) el.textContent = text;
  }

  function back(result) {
    location.href = 'evermoney://picker?r=' + encodeURIComponent(JSON.stringify(result));
  }

  window.emPickerFail = function (message) {
    status(message);
    back({ action: 'error', message: message });
  };

  function build() {
    try {
      var shared = new google.picker.DocsView()
        .setIncludeFolders(true).setSelectFolderEnabled(true).setOwnedByMe(false).setLabel('공유 문서함');
      var mine = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
        .setSelectFolderEnabled(true).setLabel('내 드라이브');
      var picker = new google.picker.PickerBuilder()
        .addView(shared).addView(mine)
        .setOAuthToken(token).setDeveloperKey(key).setAppId(appId)
        .setOrigin(location.protocol + '//' + location.host)
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .setCallback(function (data) {
          if (data.action === google.picker.Action.PICKED) {
            back({
              action: 'picked',
              docs: data.docs.map(function (d) { return { id: d.id, name: d.name, mimeType: d.mimeType }; })
            });
          } else if (data.action === google.picker.Action.CANCEL) {
            back({ action: 'cancel' });
          }
        })
        .build();
      picker.setVisible(true);
      status('');
    } catch (e) {
      window.emPickerFail(String(e));
    }
  }

  window.emPickerStart = function () {
    if (!token || !key || !appId) {
      window.emPickerFail('에버머니 앱에서 열어 주세요.');
      return;
    }
    gapi.load('picker', { callback: build, onerror: function () { window.emPickerFail('Picker를 불러오지 못했습니다.'); } });
  };
})();
