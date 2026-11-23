// 에버머니 앱 전용 — Google Picker로 Drive 폴더를 고르고 결과를 앱(evermoney://)으로 돌려준다.
// 앱이 주소의 # 뒤에 액세스 토큰(t)·API 키(k)·프로젝트 번호(a)를 붙여 연다. # 뒤는 서버로 전송되지 않는다.
(function () {
  var params = new URLSearchParams(location.hash.slice(1));
  var token = params.get('t');
  var key = params.get('k');
  var appId = params.get('a');
  var mode = params.get('m') || 'folder'; // folder: 폴더 고르기 · files: 파일 고르기
  var parent = params.get('p');           // files일 때 처음 열 폴더 (없으면 내 드라이브)
  var query = params.get('q');            // device일 때 찾을 파일 이름 (예: "에버머니 동기화 - 아이폰")
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
      var builder = new google.picker.PickerBuilder();
      if (mode === 'device') {
        // 다른 Google 계정 기기의 동기화 파일 고르기 — 나에게 공유된 에버머니 파일만 찾아 보인다.
        var found = new google.picker.DocsView().setQuery(query || '에버머니 동기화').setOwnedByMe(false)
          .setIncludeFolders(false).setMode(google.picker.DocsViewMode.LIST).setLabel('공유받은 동기화 파일');
        var sharedAll = new google.picker.DocsView().setOwnedByMe(false).setIncludeFolders(false)
          .setMode(google.picker.DocsViewMode.LIST).setLabel('공유 문서함');
        builder.addView(found).addView(sharedAll);
      } else if (mode === 'files') {
        // 동기화 폴더에서 바로 연다. 폴더로 들어갈 수는 있지만 고를 수 있는 것은 파일뿐이다.
        var inFolder = new google.picker.DocsView().setIncludeFolders(true).setSelectFolderEnabled(false)
          .setMode(google.picker.DocsViewMode.LIST).setLabel('동기화 폴더');
        if (parent) inFolder.setParent(parent);
        var search = new google.picker.DocsView().setQuery('emsync').setOwnedByMe(false)
          .setMode(google.picker.DocsViewMode.LIST).setLabel('에버머니 파일');
        builder.addView(inFolder).addView(search);
      } else {
        var shared = new google.picker.DocsView()
          .setIncludeFolders(true).setSelectFolderEnabled(true).setOwnedByMe(false).setLabel('공유 문서함');
        var mine = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
          .setSelectFolderEnabled(true).setLabel('내 드라이브');
        builder.addView(shared).addView(mine);
      }
      var picker = builder
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
