;(function(){
  function getCookie(name){
    var m = document.cookie.match('(^|;)\\s*'+name+'=([^;]+)')
    return m ? decodeURIComponent(m[2]) : null
  }
  function setCookie(name, value, days){
    var d = new Date(); d.setTime(d.getTime() + (days||365)*24*60*60*1000)
    document.cookie = name + '=' + encodeURIComponent(value) + ';path=/;expires=' + d.toUTCString()
  }

  window.i18nTranslations = window.i18nTranslations || {}
  var t = window.i18nTranslations
  t.en = t.en || {}

  function snapshotEnglish(){
    document.querySelectorAll('[data-translate]').forEach(function(el){
      var key = (el.getAttribute('data-translate')||'').trim()
      if(!key) return
      var current = ''
      if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'){
        current = el.placeholder || el.value || ''
      } else {
        current = el.innerText || el.textContent || ''
      }
      current = (current+'').trim()
      if(current && !t.en[key]) t.en[key] = current
    })
  }

  function applyLang(lang){
    document.querySelectorAll('[data-translate]').forEach(function(el){
      var key = (el.getAttribute('data-translate')||'').trim()
      if(!key) return
      var text = (t[lang] && t[lang][key]) || t.en[key] || ''
      if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'){
        if(el.placeholder) el.placeholder = text
        else el.value = text
      } else {
        el.innerText = text
      }
    })
  }

  function init(){
    snapshotEnglish()
    var lang = getCookie('ylang') || 'en'
    applyLang(lang)
    window.setLanguage = function(langCode){ setCookie('ylang', langCode); applyLang(langCode) }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})();
