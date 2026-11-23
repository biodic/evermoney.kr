// 에버머니 앱 전용 — Google Picker로 Drive 파일·폴더를 고르고 결과를 앱(evermoney://)으로 돌려준다.
// 앱이 주소의 # 뒤에 액세스 토큰(t)·API 키(k)·프로젝트 번호(a)를 붙여 연다. # 뒤는 서버로 전송되지 않는다.
//
// [먼저 이 창에서 Google 로그인] (2026-11-23) Picker 화면(docs.google.com)은 이 브라우저에 Google 로그인이
//   되어 있어야 열린다. 앱이 연 창에는 로그인이 없을 수 있어 "Can't access your Google Account"가 났다.
//   앱이 웹 클라이언트 ID(c)를 주면, 먼저 Google 로그인(OAuth) 화면으로 갔다가 돌아와서 그 토큰으로 Picker를 연다.
//   같은 프로젝트의 클라이언트라 여기서 고른 파일은 앱(drive.file)에서도 읽힌다. c가 없으면 앱의 토큰(t)을 그대로 쓴다.
(function () {
  var REDIRECT = location.protocol + '//' + location.host + location.pathname;
  var hash = new URLSearchParams(location.hash.slice(1));
  // 토큰이 방문 기록에 남지 않게 주소에서 지운다.
  try { history.replaceState(null, '', location.pathname); } catch (e) {}

  var params;   // 앱이 준 값 (k, a, m, p, q, c, e)
  var token;    // Picker에 넘길 액세스 토큰
  var fromLogin = hash.has('access_token') || hash.has('error');

  if (fromLogin) {
    // Google 로그인에서 돌아왔다 — 앱이 준 값은 state에 실어 보냈다.
    try { params = new URLSearchParams(atob((hash.get('state') || '').replace(/-/g, '+').replace(/_/g, '/'))); }
    catch (e) { params = new URLSearchParams(); }
    token = hash.get('access_token');
  } else {
    params = hash;
    token = hash.get('t');
  }

  var key = params.get('k');
  var appId = params.get('a');
  var mode = params.get('m') || 'folder'; // folder: 폴더 · files: 파일 · device: 다른 계정 기기의 동기화 파일
  var parent = params.get('p');           // files일 때 처음 열 폴더 (없으면 내 드라이브)
  var query = params.get('q');            // device일 때 찾을 파일 이름 (예: "에버머니 동기화 파일 (아이폰)")
  var clientId = params.get('c');         // 웹 클라이언트 ID — 있으면 먼저 Google 로그인
  var email = params.get('e');            // 로그인 화면에 미리 넣을 계정
  var debug = params.get('d') === '1';    // 개발 빌드 — 단계를 화면에 보이고, 눌러야 Picker를 연다

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

  // 앱이 준 값을 state에 실어 Google 로그인으로 간다. 토큰(t)은 싣지 않는다 — 돌아오면 새 토큰을 받는다.
  function login() {
    var keep = new URLSearchParams();
    ['k', 'a', 'm', 'p', 'q', 'c', 'e', 'd'].forEach(function (n) { if (params.get(n)) keep.set(n, params.get(n)); });
    var state = btoa(keep.toString()).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    var q = new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT,
      response_type: 'token',
      scope: 'https://www.googleapis.com/auth/drive.file',
      include_granted_scopes: 'true',
      state: state
    });
    if (email) q.set('login_hint', email);
    status('Google 로그인으로 이동합니다…');
    location.replace('https://accounts.google.com/o/oauth2/v2/auth?' + q.toString());
  }

  // [top] 전체 화면 Picker (2026-11-23 시험). 페이지 안에 끼운 Picker는 크로스 사이트 추적 방지가 켜진 Safari에서
  //   Google 로그인 쿠키를 못 써 "Can't access your Google Account"가 된다. Picker 주소(toUri)를 맨 바깥 화면으로
  //   열면 Google이 당사자라 쿠키가 막히지 않는다. 대신 고른 결과는 돌려받지 못한다 — 파일을 고르는 순간 앱에
  //   권한이 생기는지에 기댄다. 사용자가 창을 닫으면 앱이 동기화해서 그 파일이 보이는지 확인한다.
  function build(top) {
    try {
      var builder = new google.picker.PickerBuilder();
      if (mode === 'device') {
        // 다른 Google 계정 기기의 동기화 파일 고르기 — 나에게 공유된 에버머니 파일만 찾아 보인다.
        var found = new google.picker.DocsView().setQuery(query || '에버머니 동기화 파일').setOwnedByMe(false)
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
      ;
      if (top) {
        status('Google Picker로 이동합니다… 파일을 고른 뒤 이 창을 닫아 주세요.');
        var uri = picker.toUri();
        if (uri.charAt(0) === '/') uri = 'https://docs.google.com' + uri; // 상대 주소로 올 때
        location.href = uri;
        return;
      }
      picker = picker.build();
      picker.setVisible(true);
      status('');
    } catch (e) {
      window.emPickerFail(String(e));
    }
  }

  // [진단] (2026-11-23) "Can't access your Google Account"의 원인을 가리기 위해 단계를 보인다.
  function diag(next) {
    var box = document.getElementById('em_picker_status');
    var lines = [];
    function show() { if (box) box.textContent = lines.join('\n'); }
    lines.push('로그인 단계 거침: ' + (fromLogin ? '예' : '아니오') + ' · 웹 클라이언트: ' + (clientId ? '있음' : '없음'));
    lines.push('앱 계정(e): ' + (email || '-'));
    lines.push('토큰: ' + (token ? '있음 (' + token.length + '자)' : '없음'));
    show();
    var waits = [];
    if (token) {
      waits.push(fetch('https://oauth2.googleapis.com/tokeninfo?access_token=' + encodeURIComponent(token))
        .then(function (r) { return r.json(); })
        .then(function (j) { lines.push('토큰 계정: ' + (j.email || '-') + ' · 범위: ' + (j.scope || j.error_description || '-')); })
        .catch(function (e) { lines.push('토큰 확인 실패: ' + e); }));
    }
    if (document.hasStorageAccess) {
      waits.push(document.hasStorageAccess()
        .then(function (v) { lines.push('저장소 접근: ' + v); })
        .catch(function () { lines.push('저장소 접근: 확인 불가'); }));
    }
    lines.push('쿠키 사용: ' + navigator.cookieEnabled + ' · ' + navigator.userAgent);
    Promise.all(waits).then(function () {
      show();
      var btn = document.createElement('button');
      btn.className = 'em_picker_go';
      btn.textContent = 'Picker 열기';
      var btn2 = document.createElement('button');
      btn2.className = 'em_picker_go';
      btn2.textContent = '전체 화면 Picker (시험)';
      btn.onclick = function () { btn.remove(); btn2.remove(); next(false); };
      btn2.onclick = function () { btn.remove(); btn2.remove(); next(true); };
      box.parentNode.appendChild(btn);
      box.parentNode.appendChild(btn2);
    });
  }

  function loadPicker(top) {
    gapi.load('picker', { callback: function () { build(top); }, onerror: function () { window.emPickerFail('Picker를 불러오지 못했습니다.'); } });
  }

  window.emPickerStart = function () {
    if (fromLogin && hash.has('error')) {
      window.emPickerFail('Google 로그인을 마치지 못했습니다. (' + hash.get('error') + ')');
      return;
    }
    if (!key || !appId) {
      window.emPickerFail('에버머니 앱에서 열어 주세요.');
      return;
    }
    if (clientId && !fromLogin) {
      login();
      return;
    }
    if (!token) {
      window.emPickerFail('에버머니 앱에서 열어 주세요.');
      return;
    }
    if (debug) { diag(loadPicker); return; }
    loadPicker();
  };
})();
