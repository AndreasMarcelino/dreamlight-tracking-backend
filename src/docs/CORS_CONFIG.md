# CORS Configuration Guide

## Mengizinkan Multiple Origins

Aplikasi ini sudah dikonfigurasi untuk mendukung multiple origins (domain yang diizinkan mengakses API).

### Cara Setup di Environment Variables

Di file `.env` atau di Vercel Environment Variables, set `CORS_ORIGIN` dengan format berikut:

#### Single Origin
```bash
CORS_ORIGIN=https://backend-dashboard.com
```

#### Multiple Origins
Pisahkan dengan koma (`,`):
```bash
CORS_ORIGIN=https://backend-dashboard.com,https://live-dashboard.com
```

#### Multiple Origins dengan Subdomain
```bash
CORS_ORIGIN=https://backend-dashboard.com,https://live-dashboard.com,https://admin.backend-dashboard.com
```

### Contoh untuk Development dan Production

#### Development (.env)
```bash
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

#### Production (Vercel Environment Variables)
```bash
CORS_ORIGIN=https://backend-dashboard.com,https://live-dashboard.com
```

### Setup di Vercel

1. Buka project di Vercel Dashboard
2. Masuk ke **Settings** → **Environment Variables**
3. Tambahkan variable baru:
   - **Name:** `CORS_ORIGIN`
   - **Value:** `https://backend-dashboard.com,https://live-dashboard.com`
   - **Environment:** Production (atau pilih sesuai kebutuhan)
4. Klik **Save**
5. Redeploy aplikasi

### Catatan Penting

- ✅ Tidak ada spasi setelah koma
- ✅ Gunakan HTTPS di production (bukan HTTP)
- ✅ Pastikan tidak ada trailing slash di akhir URL
- ✅ Format yang benar: `https://domain.com` bukan `https://domain.com/`

### Testing CORS

Untuk test apakah CORS sudah bekerja, coba akses API dari browser console:

```javascript
fetch('https://your-api.vercel.app/api/auth/health', {
  method: 'GET',
  credentials: 'include'
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('CORS Error:', error));
```

Jika muncul error CORS, cek:
1. Apakah origin sudah ditambahkan di `CORS_ORIGIN`?
2. Apakah sudah redeploy setelah update environment variable?
3. Apakah format URL sudah benar (https/http, tanpa trailing slash)?
