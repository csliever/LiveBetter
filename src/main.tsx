import { render } from 'preact'
import { registerSW } from 'virtual:pwa-register'
import { App } from './app'
import './styles.css'

registerSW({
  onNeedRefresh() {
    const toast = document.createElement('div')
    toast.className = 'update-toast'
    const text = document.createElement('span')
    text.textContent = '有新版本'
    const btn = document.createElement('button')
    btn.className = 'btn btn-primary'
    btn.textContent = '刷新'
    btn.onclick = () => location.reload()
    toast.append(text, btn)
    document.body.appendChild(toast)
  },
})

render(<App />, document.getElementById('app')!)
