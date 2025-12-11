const fs = require('fs')
const path = require('path')

function walk(dir){
  let results = []
  fs.readdirSync(dir, { withFileTypes: true }).forEach(d => {
    const full = path.join(dir, d.name)
    if(d.isDirectory()) results = results.concat(walk(full))
    else if(d.isFile() && full.endsWith('.html')) results.push(full)
  })
  return results
}

function fixFile(file){
  let s = fs.readFileSync(file,'utf8')
  let orig = s

  // 1) Tags with closing tag: capture data-translate="???..." and inner text
  s = s.replace(/<([a-zA-Z0-9\-]+)([^>]*)data-translate="(\?+)"([^>]*)>([\s\S]*?)<\/\1>/g, (m, tag, a1, q, a2, inner) => {
    const text = (inner||'').replace(/<[^>]+>/g,'').trim()
    if(!text) return m
    const newAttr = `data-translate="${text.replace(/"/g,'&#34;')}"`
    return `<${tag}${a1}${newAttr}${a2}>${inner}</${tag}>`
  })

  // 2) Input/textarea/self-closing: use placeholder or value if present
  s = s.replace(/<(input|textarea)([^>]*?)data-translate="(\?+)"([^>]*?)>/g, (m, tag, a1, q, a2) => {
    const attrs = (a1 + ' ' + a2)
    const ph = attrs.match(/placeholder=\"([^\"]*)\"/) || attrs.match(/value=\"([^\"]*)\"/)
    const text = ph ? ph[1].trim() : ''
    if(!text) return m
    const newAttr = `data-translate="${text.replace(/"/g,'&#34;')}"`
    return `<${tag}${a1} ${newAttr}${a2}>`
  })

  if(s !== orig){
    fs.writeFileSync(file, s, 'utf8')
    return true
  }
  return false
}

const files = walk(process.cwd())
let changed = 0
files.forEach(f => {
  try{
    if(fixFile(f)) changed++
  }catch(e){
    console.error('ERR', f, e.message)
  }
})

console.log('Processed', files.length, 'HTML files, changed', changed)
