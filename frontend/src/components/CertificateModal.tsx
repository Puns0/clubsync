import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Award, 
  Download, 
  Printer, 
  X, 
  Check, 
  Palette, 
  Send
} from 'lucide-react';
import API_BASE_URL from '../lib/api';

interface CertificateTemplate {
  theme: 'gold_crest' | 'modern_tech' | 'academic';
  title: string;
  subtitle: string;
  message: string;
  issuerName: string;
  issuerTitle: string;
}

interface CertificateData {
  eventId: string;
  eventTitle: string;
  clubName: string;
  eventDate: string;
  studentName: string;
  certificatesIssued: boolean;
  template: CertificateTemplate;
}

interface CertificateModalProps {
  eventId?: string | number;
  event?: {
    id: string | number;
    title: string;
    certificateTemplate?: string;
    certificatesIssued?: number;
  };
  token: string | null;
  studentName?: string;
  isOrganizer?: boolean;
  onClose: () => void;
  onPublished?: () => void;
}

export default function CertificateModal({
  eventId,
  event,
  token,
  studentName,
  isOrganizer = false,
  onClose,
  onPublished
}: CertificateModalProps) {
  const targetEventId = event?.id || eventId;
  const [certData, setCertData] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Organizer Edit Mode
  const [activeTheme, setActiveTheme] = useState<'gold_crest' | 'modern_tech' | 'academic'>('gold_crest');
  const [certTitle, setCertTitle] = useState('CERTIFICATE OF PARTICIPATION');
  const [certSubtitle, setCertSubtitle] = useState('This is proudly presented to');
  const [certMessage, setCertMessage] = useState('for active participation and successful completion of');
  const [issuerName, setIssuerName] = useState('');
  const [issuerTitle, setIssuerTitle] = useState('Event Organizer');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fetch certificate details
  const fetchCertificate = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const sampleQuery = studentName ? `?sampleStudentName=${encodeURIComponent(studentName)}` : '';
      const res = await fetch(`${API_BASE_URL}/events/${targetEventId}/certificate${sampleQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setCertData(data);
        if (data.template) {
          setActiveTheme(data.template.theme || 'gold_crest');
          setCertTitle(data.template.title || 'CERTIFICATE OF PARTICIPATION');
          setCertSubtitle(data.template.subtitle || 'This is proudly presented to');
          setCertMessage(data.template.message || 'for active participation and successful completion of');
          setIssuerName(data.template.issuerName || data.clubName || 'Club President');
          setIssuerTitle(data.template.issuerTitle || 'Event Organizer');
        }
      } else {
        setErrorMsg(data.error || 'Failed to load certificate details.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error while loading certificate.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificate();
  }, [targetEventId, token]);

  // Draw Certificate on HTML5 Canvas with High-DPI Resolution
  useEffect(() => {
    if (!certData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High resolution canvas dimensions (1920x1080 16:9 Landscape)
    const width = 1920;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;

    // Clear Canvas
    ctx.clearRect(0, 0, width, height);

    const displayName = isOrganizer && studentName ? studentName : certData.studentName;

    // THEME 1: GOLD CREST CLASSIC
    if (activeTheme === 'gold_crest') {
      // Background Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#FFFFFF');
      bgGrad.addColorStop(1, '#FAF7F2');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Outer Gold Border
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 14;
      ctx.strokeRect(40, 40, width - 80, height - 80);

      // Inner Fine Accent Border
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 3;
      ctx.strokeRect(60, 60, width - 120, height - 120);

      // Corner Ornaments
      ctx.fillStyle = '#D4AF37';
      const cornerSize = 25;
      ctx.fillRect(40, 40, cornerSize, cornerSize);
      ctx.fillRect(width - 40 - cornerSize, 40, cornerSize, cornerSize);
      ctx.fillRect(40, height - 40 - cornerSize, cornerSize, cornerSize);
      ctx.fillRect(width - 40 - cornerSize, height - 40 - cornerSize, cornerSize, cornerSize);

      // Club Badge / Header Icon
      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(certData.clubName.toUpperCase(), width / 2, 140);

      // Main Title
      ctx.fillStyle = '#D4AF37';
      ctx.font = 'bold 56px serif';
      ctx.fillText(certTitle, width / 2, 230);

      // Subtitle Line
      ctx.fillStyle = '#64748B';
      ctx.font = 'italic 28px serif';
      ctx.fillText(certSubtitle, width / 2, 330);

      // Student Name (Prominent & Elegant)
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 72px serif';
      ctx.fillText(displayName, width / 2, 440);

      // Underline accent under student name
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 250, 470);
      ctx.lineTo(width / 2 + 250, 470);
      ctx.stroke();

      // Description Body Message
      ctx.fillStyle = '#475569';
      ctx.font = '26px sans-serif';
      ctx.fillText(certMessage, width / 2, 550);

      // Event Title
      ctx.fillStyle = '#E34234';
      ctx.font = 'bold 42px sans-serif';
      ctx.fillText(`"${certData.eventTitle}"`, width / 2, 630);

      // Date Line
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(`Held on: ${certData.eventDate}`, width / 2, 710);

      // Official Gold Seal Circle Bottom Center
      ctx.fillStyle = '#D4AF37';
      ctx.beginPath();
      ctx.arc(width / 2, 850, 55, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(width / 2, 850, 47, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('OFFICIAL', width / 2, 845);
      ctx.fillText('VERIFIED', width / 2, 865);

      // Left Signatory Line
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(250, 880);
      ctx.lineTo(550, 880);
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(issuerName || certData.clubName, 400, 915);
      ctx.fillStyle = '#64748B';
      ctx.font = '20px sans-serif';
      ctx.fillText(issuerTitle || 'Event Organizer', 400, 945);

      // Right Signatory Line
      ctx.beginPath();
      ctx.moveTo(width - 550, 880);
      ctx.lineTo(width - 250, 880);
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('ClubSync Authority', width - 400, 915);
      ctx.fillStyle = '#64748B';
      ctx.font = '20px sans-serif';
      ctx.fillText('Campus Platform', width - 400, 945);
    } 
    // THEME 2: MODERN TECH SLEEK
    else if (activeTheme === 'modern_tech') {
      // Dark Gradient Background
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#0F172A');
      bgGrad.addColorStop(1, '#1E1B4B');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Neon Cyan Accent Border
      ctx.strokeStyle = '#06B6D4';
      ctx.lineWidth = 10;
      ctx.strokeRect(40, 40, width - 80, height - 80);

      // Inner Purple Glow Line
      ctx.strokeStyle = '#A855F7';
      ctx.lineWidth = 3;
      ctx.strokeRect(55, 55, width - 110, height - 110);

      // Top Club Badge
      ctx.fillStyle = '#06B6D4';
      ctx.font = 'bold 26px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`// ${certData.clubName.toUpperCase()}`, width / 2, 140);

      // Main Title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'extrabold 60px sans-serif';
      ctx.fillText(certTitle, width / 2, 240);

      // Subtitle Line
      ctx.fillStyle = '#94A3B8';
      ctx.font = '26px sans-serif';
      ctx.fillText(certSubtitle, width / 2, 330);

      // Student Name
      ctx.fillStyle = '#38BDF8';
      ctx.font = 'extrabold 74px sans-serif';
      ctx.fillText(displayName, width / 2, 440);

      // Message
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '26px sans-serif';
      ctx.fillText(certMessage, width / 2, 540);

      // Event Title
      ctx.fillStyle = '#F43F5E';
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText(certData.eventTitle, width / 2, 620);

      // Date Line
      ctx.fillStyle = '#94A3B8';
      ctx.font = '22px monospace';
      ctx.fillText(`TIMESTAMP: ${certData.eventDate}`, width / 2, 700);

      // Left Signatory Line
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(250, 880);
      ctx.lineTo(550, 880);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(issuerName || certData.clubName, 400, 915);
      ctx.fillStyle = '#94A3B8';
      ctx.font = '20px sans-serif';
      ctx.fillText(issuerTitle || 'Event Organizer', 400, 945);

      // Right Signatory Line
      ctx.beginPath();
      ctx.moveTo(width - 550, 880);
      ctx.lineTo(width - 250, 880);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('ClubSync Tech', width - 400, 915);
      ctx.fillStyle = '#94A3B8';
      ctx.font = '20px sans-serif';
      ctx.fillText('Digital Verification', width - 400, 945);
    }
    // THEME 3: MINIMAL ACADEMIC
    else {
      // Clean Off-white Background
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, width, height);

      // Burgundy Academic Frame
      ctx.strokeStyle = '#881337';
      ctx.lineWidth = 12;
      ctx.strokeRect(50, 50, width - 100, height - 100);

      // Club Name
      ctx.fillStyle = '#881337';
      ctx.font = 'bold 28px serif';
      ctx.textAlign = 'center';
      ctx.fillText(certData.clubName, width / 2, 150);

      // Title
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 54px serif';
      ctx.fillText(certTitle, width / 2, 240);

      // Subtitle
      ctx.fillStyle = '#64748B';
      ctx.font = 'italic 26px serif';
      ctx.fillText(certSubtitle, width / 2, 330);

      // Student Name
      ctx.fillStyle = '#881337';
      ctx.font = 'bold 70px serif';
      ctx.fillText(displayName, width / 2, 440);

      // Message
      ctx.fillStyle = '#334155';
      ctx.font = '26px sans-serif';
      ctx.fillText(certMessage, width / 2, 540);

      // Event Title
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 42px serif';
      ctx.fillText(certData.eventTitle, width / 2, 620);

      // Date
      ctx.fillStyle = '#64748B';
      ctx.font = '22px serif';
      ctx.fillText(`Date: ${certData.eventDate}`, width / 2, 700);

      // Signatures
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(300, 880);
      ctx.lineTo(550, 880);
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 22px serif';
      ctx.fillText(issuerName || certData.clubName, 425, 915);

      ctx.beginPath();
      ctx.moveTo(width - 550, 880);
      ctx.lineTo(width - 300, 880);
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 22px serif';
      ctx.fillText('Campus Director', width - 425, 915);
    }
  }, [certData, activeTheme, certTitle, certSubtitle, certMessage, issuerName, issuerTitle, studentName, isOrganizer]);

  // Download high-resolution PNG image
  const handleDownloadImage = () => {
    if (!canvasRef.current || !certData) return;
    const canvas = canvasRef.current;
    const image = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    const safeName = (studentName || certData.studentName).replace(/[^a-z0-9]/gi, '_');
    const safeEvent = certData.eventTitle.replace(/[^a-z0-9]/gi, '_');
    link.download = `Certificate_${safeName}_${safeEvent}.png`;
    link.href = image;
    link.click();
  };

  // Trigger Browser Print for PDF saving
  const handlePrintPdf = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    const windowContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Certificate - ${certData?.eventTitle}</title>
          <style>
            @page { size: landscape; margin: 0; }
            body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; background: #fff; }
            img { max-width: 100%; max-height: 100vh; object-fit: contain; }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" onload="window.print(); window.close();" />
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(windowContent);
      printWindow.document.close();
    }
  };

  // Save / Publish Template (Organizer action)
  const handleSaveAndPublish = async (issueNow: boolean) => {
    if (!certData) return;
    setSavingTemplate(true);
    setPublishSuccess('');

    try {
      const templateData = {
        theme: activeTheme,
        title: certTitle,
        subtitle: certSubtitle,
        message: certMessage,
        issuerName,
        issuerTitle
      };

      const res = await fetch(`${API_BASE_URL}/events/${targetEventId}/certificate-template`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          template: templateData,
          issueNow
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPublishSuccess(data.message);
        if (onPublished) onPublished();
      } else {
        setErrorMsg(data.error || 'Failed to save certificate template.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error while saving template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-ink/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden border border-brand-ink/10 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-brand-ink to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-500/20 text-yellow-400 rounded-xl border border-yellow-400/30">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {isOrganizer ? 'Certificate Template Designer' : 'Official Participation Certificate'}
              </h3>
              <p className="text-xs text-slate-300 font-medium truncate max-w-[280px]">
                {certData ? certData.eventTitle : 'Loading...'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-24 text-center text-brand-ink/40">
              <div className="w-8 h-8 border-3 border-brand-ink/20 border-t-brand-vermilion rounded-full animate-spin mx-auto mb-3" />
              Loading certificate preview...
            </div>
          ) : errorMsg ? (
            <div className="p-6 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-center text-sm font-medium">
              {errorMsg}
            </div>
          ) : certData && (
            <>
              {/* Success Banner */}
              {publishSuccess && (
                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-300 text-sm font-bold flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-600" />
                  <span>{publishSuccess}</span>
                </div>
              )}

              {/* Organizer Theme Selector & Customizer */}
              {isOrganizer && (
                <div className="p-5 bg-brand-offwhite/60 rounded-2xl border border-brand-ink/10 space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-brand-ink flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-brand-vermilion" /> Customize Template & Wording
                    </span>
                    <span className="text-[11px] text-brand-ink/50 font-medium">
                      Changes update live in the preview below
                    </span>
                  </div>

                  {/* Theme Selectors */}
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTheme('gold_crest')}
                      className={`p-3 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                        activeTheme === 'gold_crest' 
                          ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-sm' 
                          : 'bg-white border-brand-ink/10 text-brand-ink/70'
                      }`}
                    >
                      👑 Gold Crest Classic
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTheme('modern_tech')}
                      className={`p-3 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                        activeTheme === 'modern_tech' 
                          ? 'bg-slate-900 border-cyan-400 text-cyan-400 shadow-sm' 
                          : 'bg-white border-brand-ink/10 text-brand-ink/70'
                      }`}
                    >
                      ⚡ Modern Tech Sleek
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTheme('academic')}
                      className={`p-3 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                        activeTheme === 'academic' 
                          ? 'bg-rose-50 border-rose-400 text-rose-900 shadow-sm' 
                          : 'bg-white border-brand-ink/10 text-brand-ink/70'
                      }`}
                    >
                      📜 Minimal Academic
                    </button>
                  </div>

                  {/* Wording Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="font-bold text-brand-ink/60 block mb-1">Header Title</label>
                      <input
                        type="text"
                        value={certTitle}
                        onChange={(e) => setCertTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-brand-ink/15 rounded-xl font-medium focus:ring-2 focus:ring-brand-vermilion"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-brand-ink/60 block mb-1">Subtitle Line</label>
                      <input
                        type="text"
                        value={certSubtitle}
                        onChange={(e) => setCertSubtitle(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-brand-ink/15 rounded-xl font-medium focus:ring-2 focus:ring-brand-vermilion"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="font-bold text-brand-ink/60 block mb-1">Participation Message</label>
                      <input
                        type="text"
                        value={certMessage}
                        onChange={(e) => setCertMessage(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-brand-ink/15 rounded-xl font-medium focus:ring-2 focus:ring-brand-vermilion"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-brand-ink/60 block mb-1">Signatory Name</label>
                      <input
                        type="text"
                        placeholder="e.g. John Doe"
                        value={issuerName}
                        onChange={(e) => setIssuerName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-brand-ink/15 rounded-xl font-medium focus:ring-2 focus:ring-brand-vermilion"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-brand-ink/60 block mb-1">Signatory Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Club President"
                        value={issuerTitle}
                        onChange={(e) => setIssuerTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-brand-ink/15 rounded-xl font-medium focus:ring-2 focus:ring-brand-vermilion"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Live Canvas Viewport */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-ink/50 block">
                  High-Resolution Certificate Canvas
                </span>
                <div className="w-full aspect-[16/9] bg-slate-900 rounded-2xl overflow-hidden border-2 border-brand-ink/10 shadow-lg flex items-center justify-center">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full object-contain bg-white"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-brand-offwhite/80 border-t border-brand-ink/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadImage}
              disabled={loading || !!errorMsg}
              className="px-4 py-2.5 bg-brand-ink hover:bg-black text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Download PNG
            </button>
            <button
              onClick={handlePrintPdf}
              disabled={loading || !!errorMsg}
              className="px-4 py-2.5 bg-white hover:bg-brand-offwhite text-brand-ink text-xs font-bold rounded-xl border border-brand-ink/15 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
          </div>

          {isOrganizer ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={savingTemplate}
                onClick={() => handleSaveAndPublish(false)}
                className="px-4 py-2.5 bg-white hover:bg-brand-offwhite text-brand-ink text-xs font-bold rounded-xl border border-brand-ink/15 transition-all cursor-pointer disabled:opacity-50"
              >
                Save Template Draft
              </button>
              <button
                type="button"
                disabled={savingTemplate}
                onClick={() => handleSaveAndPublish(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                Publish & Issue to All Participants
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-white hover:bg-brand-offwhite text-brand-ink text-xs font-bold rounded-xl border border-brand-ink/15 transition-all cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
