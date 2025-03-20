const res = await fetch('/_health')
res.text().finally(() => location.reload())
