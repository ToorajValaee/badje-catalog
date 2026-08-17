'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Edit3, ExternalLink, FileText, Gauge, LogOut, Plus, QrCode, RefreshCw, Trash2, UploadCloud, X } from 'lucide-react';

type CatalogItem = {
  id: string;
  title: string;
  slug: string;
  objectKey: string;
  originalFilename: string;
  fileSize: number;
  active: boolean;
  renderDpi: number;
  webpQuality: number;
  webpLossless: boolean;
  generatedPageCount: number | null;
  generatedLinkCount: number | null;
  generatedSize: number;
  generatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type RenderDefaults = { renderDpi: number; webpQuality: number; webpLossless: boolean };
type Modal = { type: 'create' } | { type: 'edit'; item: CatalogItem } | { type: 'qr'; item: CatalogItem } | null;
type Phase = 'idle' | 'uploading' | 'processing' | 'regenerating';

function formatBytes(n: number) {
  if (!n) return '0 KB';
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function upload(method: 'POST' | 'PUT', url: string, file: File | null, progress: (n: number) => void, processing: () => void) {
  return new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.responseType = 'json';
    xhr.setRequestHeader('x-has-file', file ? 'true' : 'false');
    if (file) {
      xhr.setRequestHeader('Content-Type', 'application/pdf');
      xhr.setRequestHeader('x-file-size', String(file.size));
      xhr.setRequestHeader('x-file-name', encodeURIComponent(file.name));
      xhr.upload.onprogress = e => {
        if (!e.lengthComputable) return;
        const pct = Math.round(e.loaded / e.total * 100);
        progress(pct);
        if (pct >= 100) processing();
      };
    } else {
      processing();
    }
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve(xhr.response) : reject(new Error(xhr.response?.error || 'خطا در انجام عملیات'));
    xhr.onerror = () => reject(new Error('ارتباط با سرور برقرار نشد.'));
    xhr.send(file || null);
  });
}

export default function AdminDashboard({
  catalogs,
  maxUploadMb,
  renderDefaults,
}: {
  catalogs: CatalogItem[];
  maxUploadMb: number;
  renderDefaults: RenderDefaults;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<Modal>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [renderDpi, setRenderDpi] = useState(renderDefaults.renderDpi);
  const [webpQuality, setWebpQuality] = useState(renderDefaults.webpQuality);
  const [webpLossless, setWebpLossless] = useState(renderDefaults.webpLossless);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const totalSize = useMemo(() => catalogs.reduce((sum, c) => sum + c.fileSize, 0), [catalogs]);
  const totalWebSize = useMemo(() => catalogs.reduce((sum, c) => sum + (c.generatedSize || 0), 0), [catalogs]);

  function qualityParams() {
    return {
      renderDpi: String(renderDpi),
      webpQuality: String(webpQuality),
      webpLossless: String(webpLossless),
    };
  }

  function settingsChanged(item: CatalogItem) {
    return item.renderDpi !== renderDpi || item.webpQuality !== webpQuality || item.webpLossless !== webpLossless;
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setBusy(true);
    setPhase(selectedFile ? 'uploading' : 'processing');
    setProgress(0);
    const form = new FormData(e.currentTarget);
    const title = String(form.get('title') || '').trim();
    const slug = String(form.get('slug') || '').trim();
    const active = form.get('active') === 'on';
    const file = selectedFile;

    try {
      if (modal?.type === 'create' && !file) throw new Error('انتخاب فایل PDF الزامی است.');
      if (file && file.size > maxUploadMb * 1024 * 1024) throw new Error(`حداکثر حجم فایل ${maxUploadMb} مگابایت است.`);

      const mustRegenerate = modal?.type === 'edit' && !file && settingsChanged(modal.item);
      if (mustRegenerate) setPhase('regenerating');
      const qs = new URLSearchParams({
        title,
        slug,
        active: String(modal?.type === 'edit' ? active : true),
        ...qualityParams(),
        regenerate: String(mustRegenerate),
      });

      if (modal?.type === 'create') {
        const created = await upload('POST', `/api/admin/catalogs?${qs}`, file, setProgress, () => setPhase('processing'));
        router.refresh();
        setSelectedFile(null);
        setModal({
          type: 'qr',
          item: {
            id: created.id,
            title: created.title,
            slug: created.slug,
            objectKey: '',
            originalFilename: file?.name || '',
            fileSize: file?.size || 0,
            active: true,
            renderDpi: created.renderDpi,
            webpQuality: created.webpQuality,
            webpLossless: created.webpLossless,
            generatedPageCount: created.pageCount,
            generatedLinkCount: created.linkCount,
            generatedSize: created.generatedSize,
            generatedAt: created.generatedAt,
            createdAt: '',
            updatedAt: '',
          },
        });
      } else if (modal?.type === 'edit') {
        await upload('PUT', `/api/admin/catalogs/${modal.item.id}?${qs}`, file, setProgress, () => setPhase(mustRegenerate ? 'regenerating' : 'processing'));
        setSelectedFile(null);
        setModal(null);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره کاتالوگ');
    } finally {
      setBusy(false);
      setPhase('idle');
    }
  }

  async function regenerateNow() {
    if (modal?.type !== 'edit') return;
    setError('');
    setBusy(true);
    setPhase('regenerating');
    setProgress(0);
    try {
      const qs = new URLSearchParams(qualityParams());
      const res = await fetch(`/api/admin/catalogs/${modal.item.id}/regenerate?${qs}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'بازسازی انجام نشد.');
      const updated: CatalogItem = {
        ...modal.item,
        renderDpi: data.renderDpi,
        webpQuality: data.webpQuality,
        webpLossless: data.webpLossless,
        generatedPageCount: data.pageCount,
        generatedLinkCount: data.linkCount,
        generatedSize: data.generatedSize,
        generatedAt: data.generatedAt,
        updatedAt: data.generatedAt,
      };
      setModal({ type: 'edit', item: updated });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'بازسازی نسخه وب انجام نشد.');
    } finally {
      setBusy(false);
      setPhase('idle');
    }
  }

  async function remove(item: CatalogItem) {
    if (!confirm(`کاتالوگ «${item.title}» حذف شود؟`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/catalogs/${item.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حذف انجام نشد.');
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'حذف انجام نشد.');
    } finally {
      setBusy(false);
    }
  }

  function copyLink(slug: string) {
    navigator.clipboard.writeText(`${window.location.origin}/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1300);
  }

  function openCreate() {
    setError('');
    setProgress(0);
    setSelectedFile(null);
    setRenderDpi(renderDefaults.renderDpi);
    setWebpQuality(renderDefaults.webpQuality);
    setWebpLossless(renderDefaults.webpLossless);
    setModal({ type: 'create' });
  }

  function openEdit(item: CatalogItem) {
    setError('');
    setProgress(0);
    setSelectedFile(null);
    setRenderDpi(item.renderDpi);
    setWebpQuality(item.webpQuality);
    setWebpLossless(item.webpLossless);
    setModal({ type: 'edit', item });
  }

  function closeModal() {
    if (busy) return;
    setSelectedFile(null);
    setError('');
    setProgress(0);
    setPhase('idle');
    setModal(null);
  }

  function clearSelectedFile() {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const progressText = phase === 'regenerating'
    ? 'در حال بازسازی نسخه وب از PDF اصلی…'
    : phase === 'processing'
      ? 'در حال ساخت نسخه وب…'
      : progress
        ? `${progress}٪ آپلود`
        : 'در حال ذخیره…';

  return <div className="adminPage">
    <header className="adminHeader"><div className="container adminHeaderInner"><a className="brand" href="/"><img src="/img/logo-mark.svg" alt=""/><span><strong>کاتالوگ دیجیتال</strong><small>BADJE</small></span></a><form action="/api/admin/logout" method="post"><button className="iconTextBtn" type="submit"><LogOut/> خروج</button></form></div></header>
    <main className="container adminMain">
      <div className="adminIntro"><div><div className="eyebrow">مدیریت محتوا</div><h1>کاتالوگ‌ها</h1><p>انتشار، ویرایش، کیفیت خروجی وب و دریافت QR Code کاتالوگ‌های بادجه.</p></div><button className="btn btnPrimary" onClick={openCreate}><Plus/> کاتالوگ جدید</button></div>
      <div className="statsRow"><article><span>تعداد کاتالوگ</span><strong>{catalogs.length}</strong></article><article><span>حجم PDF اصلی</span><strong>{formatBytes(totalSize)}</strong></article><article><span>حجم نسخه‌های وب</span><strong>{formatBytes(totalWebSize)}</strong></article></div>
      {catalogs.length ? <div className="catalogTable"><div className="catalogHead"><span>کاتالوگ</span><span>لینک</span><span>وضعیت</span><span>کیفیت وب</span><span>عملیات</span></div>{catalogs.map(item => <div className="catalogRow" key={item.id}><div className="catalogName"><div className="fileBadge"><FileText/></div><div><strong>{item.title}</strong><small>{item.originalFilename}</small></div></div><div className="catalogLink"><a href={`/${item.slug}`} target="_blank">/{item.slug} <ExternalLink/></a></div><div><span className={item.active ? 'status active' : 'status'}>{item.active ? 'فعال' : 'غیرفعال'}</span></div><div className="qualityCell"><strong>{item.renderDpi} DPI</strong><small>{item.webpLossless ? 'Lossless' : `Q${item.webpQuality}`} · {item.generatedPageCount || '—'} صفحه · {formatBytes(item.generatedSize)}</small></div><div className="rowActions"><button title="QR Code" onClick={()=>setModal({type:'qr',item})}><QrCode/></button><button title="ویرایش" onClick={()=>openEdit(item)}><Edit3/></button><button className="danger" title="حذف" disabled={busy} onClick={()=>remove(item)}><Trash2/></button></div></div>)}</div> : <div className="emptyState"><img src="/img/empty-catalog.svg" alt=""/><h2>هنوز کاتالوگی منتشر نشده</h2><p>اولین PDF را اضافه کنید تا لینک و QR آن ساخته شود.</p><button className="btn btnPrimary" onClick={openCreate}><Plus/> افزودن کاتالوگ</button></div>}
    </main>

    {(modal?.type === 'create' || modal?.type === 'edit') && <div className="modal"><div className="modalBackdrop" onClick={closeModal}/><form className="modalCard" onSubmit={save}><button type="button" className="modalClose" onClick={closeModal}><X/></button><div className="formHeading"><h2>{modal.type === 'create' ? 'کاتالوگ جدید' : 'ویرایش کاتالوگ'}</h2><p>{modal.type === 'create' ? 'PDF اصلی ذخیره می‌شود و نسخه وب با کیفیت انتخابی ساخته می‌شود.' : 'PDF اصلی حفظ می‌شود؛ می‌توانید نسخه وب را هر زمان با کیفیت دیگری بازسازی کنید.'}</p></div>{error && <div className="alertError">{error}</div>}<label className="field"><span>عنوان کاتالوگ</span><input name="title" required defaultValue={modal.type==='edit'?modal.item.title:''} placeholder="مثلاً کاتالوگ معرفی محصولات"/></label><label className="field"><span>نامک / آدرس</span><div className="slugField"><bdi>/</bdi><input name="slug" required dir="ltr" defaultValue={modal.type==='edit'?modal.item.slug:''} placeholder="hello-world"/></div><small>فقط حروف فارسی/انگلیسی، عدد و خط تیره.</small></label>{modal.type==='edit' && <label className="switchRow"><input name="active" type="checkbox" defaultChecked={modal.item.active}/><span>کاتالوگ برای عموم فعال باشد</span></label>}

      <section className="qualityPanel">
        <div className="qualityHeading"><div className="qualityIcon"><Gauge/></div><div><strong>کیفیت نسخه وب</strong><small>وضوح و فشرده‌سازی تصاویر صفحه‌ها را مشخص کنید.</small></div></div>
        <div className="qualityGrid">
          <label><span>وضوح رندر</span><select value={renderDpi} onChange={e=>setRenderDpi(Number(e.target.value))}><option value={150}>150 DPI — سبک</option><option value={200}>200 DPI — استاندارد</option><option value={250}>250 DPI — شارپ</option><option value={300}>300 DPI — باکیفیت</option><option value={350}>350 DPI — خیلی بالا</option><option value={400}>400 DPI — حداکثر</option></select></label>
          <label><span>فشرده‌سازی WebP</span><select value={webpLossless ? 'lossless' : 'lossy'} onChange={e=>setWebpLossless(e.target.value === 'lossless')}><option value="lossless">Lossless — بدون افت فشرده‌سازی</option><option value="lossy">Lossy — حجم کمتر</option></select></label>
        </div>
        {!webpLossless && <label className="qualitySlider"><span>کیفیت WebP <b>{webpQuality}</b></span><input type="range" min="70" max="100" step="1" value={webpQuality} onChange={e=>setWebpQuality(Number(e.target.value))}/><small>عدد بالاتر کیفیت بیشتر و حجم فایل بالاتر ایجاد می‌کند.</small></label>}
        <div className="qualityNote">{renderDpi >= 300 ? 'مناسب نمایشگرهای Retina و زوم بیشتر؛ زمان پردازش و حجم خروجی بیشتر است.' : renderDpi <= 150 ? 'سریع و کم‌حجم؛ برای متن‌های بسیار ریز پیشنهاد نمی‌شود.' : 'تعادل مناسب بین وضوح، حجم و سرعت بارگذاری.'}</div>
        {modal.type === 'edit' && <div className="regenBox"><div><strong>نسخه فعلی: {modal.item.renderDpi} DPI · {modal.item.webpLossless ? 'Lossless' : `Q${modal.item.webpQuality}`}</strong><small>{modal.item.generatedPageCount || '—'} صفحه · {formatBytes(modal.item.generatedSize)}{modal.item.generatedAt ? ` · ${new Date(modal.item.generatedAt).toLocaleString('fa-IR')}` : ''}</small></div><button type="button" className="btn btnSoft regenBtn" onClick={regenerateNow} disabled={busy}><RefreshCw/> بازسازی از PDF اصلی</button></div>}
      </section>

      <div className="filePicker">
        {modal.type === 'edit' && !selectedFile && <div className="currentFileCard"><div className="currentFileIcon"><FileText/></div><div className="currentFileMeta"><span>PDF اصلی ذخیره‌شده</span><strong dir="ltr">{modal.item.originalFilename}</strong><small>{formatBytes(modal.item.fileSize)}</small></div><div className="fileMiniActions"><a className="fileViewBtn" href={`/${encodeURIComponent(modal.item.slug)}`} target="_blank" rel="noreferrer">نسخه وب</a><a className="fileViewBtn" href={`/api/catalogs/${encodeURIComponent(modal.item.slug)}/pdf`}>PDF</a></div></div>}
        {selectedFile ? <div className="selectedFileCard"><div className="currentFileIcon selected"><Check/></div><div className="currentFileMeta"><span>{modal.type === 'edit' ? 'PDF اصلی جایگزین می‌شود' : 'PDF اصلی انتخاب شد'}</span><strong dir="ltr">{selectedFile.name}</strong><small>{formatBytes(selectedFile.size)}</small></div><button type="button" className="removeSelectedFile" onClick={clearSelectedFile} aria-label="حذف فایل انتخاب‌شده"><Trash2/></button></div> : <label className="uploadBox"><UploadCloud/><strong>{modal.type==='create'?'فایل PDF را انتخاب کنید':'برای جایگزینی PDF اصلی، فایل جدید انتخاب کنید'}</strong><span>حداکثر {maxUploadMb} MB</span><input ref={fileInputRef} name="pdf" type="file" accept="application/pdf,.pdf" required={modal.type==='create'} onChange={event => setSelectedFile(event.target.files?.[0] || null)}/></label>}
        {selectedFile && <label className="replaceSelectedBtn"><UploadCloud/> انتخاب فایل دیگر<input name="pdfReplacement" type="file" accept="application/pdf,.pdf" onChange={event => setSelectedFile(event.target.files?.[0] || null)}/></label>}
      </div>
      {busy && <div className="progress"><div style={{width:`${phase === 'uploading' ? Math.max(progress, 8) : 100}%`}}/><span>{progressText}</span></div>}
      <button className="btn btnPrimary full" type="submit" disabled={busy}>{busy?'در حال انجام…': modal.type === 'edit' && !selectedFile && settingsChanged(modal.item) ? 'ذخیره و بازسازی نسخه وب' : 'ذخیره کاتالوگ'}</button>
    </form></div>}

    {modal?.type === 'qr' && <div className="modal"><div className="modalBackdrop" onClick={()=>setModal(null)}/><div className="modalCard qrModal"><button className="modalClose" onClick={closeModal}><X/></button><div className="formHeading"><h2>QR Code کاتالوگ</h2><p>{modal.item.title}</p></div><div className="qrFrame"><img src={`/api/admin/catalogs/${modal.item.id}/qr`} alt="QR Code"/></div><div className="linkBox" dir="ltr">/{modal.item.slug}</div><div className="qrActions"><button className="btn btnSoft" onClick={()=>copyLink(modal.item.slug)}>{copied?<Check/>:<Copy/>}{copied?'کپی شد':'کپی لینک'}</button><a className="btn btnPrimary" href={`/api/admin/catalogs/${modal.item.id}/qr`} download={`qr-${modal.item.slug}.png`}>دانلود QR</a></div></div></div>}
  </div>;
}
