/**
 * consult.js — 진단 신청을 대시보드 DB 로도 보낸다
 *
 * 랜딩 폼은 FormSubmit(네이버 메일)로만 간다. 메일은 사람이 읽어야 끝나고,
 * 읽기 전까지 아무것도 자동으로 이어지지 않는다. 접수 2건이 전부인 이유의
 * 절반이 그것이다.
 *
 * app.top-ad.net/api/consult 로 함께 보내면 그 뒤가 전부 자동으로 이어진다:
 *   접수 → 플레이스 주소로 업체 특정 → 진단 리포트 초안 → 보드에 검토 대기
 *
 * 인바운드는 본인이 신청한 것이라 수신 동의가 있다. 전화 없이 메일·톡톡으로
 * 회신할 수 있는 유일한 경로다(정보통신망법 제50조).
 *
 * ── 왜 기존 핸들러를 안 고치는가 ──
 * 폼과 제출 로직은 source/bundle.html 안에 JSON 으로 이스케이프된 채 들어
 * 있다. 거기를 문자열로 수술하면 다음 번들 교체 때 깨진다. 이 파일은
 * build.js 가 출력물 끝에 주입하므로 다시 빌드해도 살아남는다.
 *
 * 기존 메일 전송은 건드리지 않는다. 둘 다 보내고 하나만 성공해도 접수다 —
 * 신청자에게 다시 쓰게 만드는 것이 제일 나쁘다.
 */
(function () {
  "use strict";

  var API = "https://app.top-ad.net/api/consult";

  /** 폼에서 한글 name 으로 값 꺼내기 */
  function val(form, name) {
    var el = form.elements[name];
    return el && typeof el.value === "string" ? el.value.trim() : "";
  }

  /**
   * 이메일 칸을 넣는다(선택).
   *
   * 본인이 직접 적는 것이라 정보통신망법 제50조의2 가 금지하는 "자동수집"이
   * 아니다 — 긁어 모으는 것과 적어주는 것은 다르다. 진단서를 보낼 곳이
   * 있어야 전화 없이도 일이 이어진다.
   */
  function addEmailField(form) {
    if (form.elements["이메일"]) return;
    var tel = form.querySelector("#t-tel");
    if (!tel) return;
    var wrap = tel.closest(".field");
    if (!wrap) return;

    var field = document.createElement("div");
    field.className = wrap.className;
    var label = document.createElement("label");
    label.setAttribute("for", "t-email");
    label.textContent = "이메일 (선택 · 진단서 받으실 주소)";
    var input = document.createElement("input");
    input.className = tel.className;
    input.id = "t-email";
    input.name = "이메일";
    input.type = "email";
    input.placeholder = "owner@clinic.co.kr";
    field.appendChild(label);
    field.appendChild(input);
    wrap.parentNode.insertBefore(field, wrap.nextSibling);
  }

  function payloadFrom(form) {
    var lines = [
      val(form, "현재고민"),
      val(form, "업종") && "업종: " + val(form, "업종"),
      val(form, "지역") && "지역: " + val(form, "지역"),
      val(form, "희망관리방식") && "희망 관리 방식: " + val(form, "희망관리방식"),
      val(form, "예상예산") && "예상 예산: " + val(form, "예상예산"),
    ].filter(Boolean);

    return {
      // 폼에 신청자 이름 칸이 없다. 업체명이 곧 신청자다.
      name: val(form, "업체명"),
      shop_name: val(form, "업체명"),
      phone: val(form, "연락처"),
      email: val(form, "이메일") || null,
      // 업체를 특정하는 가장 확실한 값. 상호명으로 찾으면 동명 업체에서 틀린다.
      place_url: val(form, "플레이스주소") || null,
      message: lines.join("\n"),
    };
  }

  function send(form) {
    var body = payloadFrom(form);
    if (!body.name || !body.phone) return; // 기존 폼 검증이 막아줄 것이다

    // keepalive — 제출 직후 화면이 바뀌어도 요청이 끊기지 않는다.
    try {
      fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(function () {
        /* 메일 쪽이 받아준다 */
      });
    } catch (e) {
      /* 접수 자체를 막지 않는다 */
    }
  }

  /**
   * 폼이 아니라 document 에 붙인다.
   *
   * 이 랜딩은 커스텀 컴포넌트가 상태가 바뀔 때마다 폼을 다시 그린다. 폼
   * 엘리먼트에 리스너를 걸면 다시 그려질 때 같이 사라진다 — 실제로 그래서
   * 첫 시도에 한 번도 안 불렸다. document 에 캡처 단계로 걸면 한 번만 걸면 된다.
   */
  document.addEventListener(
    "submit",
    function (e) {
      var form = e.target;
      if (form && form.tagName === "FORM") send(form);
    },
    true
  );

  /**
   * 이메일 칸도 다시 그려질 때 같이 사라진다. 없으면 다시 넣는다.
   * MutationObserver 는 과하다 — 폼은 한 화면에 하나뿐이고 1초면 충분하다.
   */
  function ensureField() {
    var form = document.querySelector("form");
    if (form) addEmailField(form);
  }
  ensureField();
  setInterval(ensureField, 1000);
})();
