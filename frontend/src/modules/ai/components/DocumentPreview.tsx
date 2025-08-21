import React, { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
// @ts-ignore
import { renderAsync as renderDocx } from 'docx-preview';
// @ts-ignore
import mammoth from 'mammoth';

interface DocumentPreviewProps {
  fileUrl: string;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ 
  fileUrl, 
  fileName, 
  isOpen, 
  onClose 
}) => {
  const [type, setType] = useState<'pdf' | 'docx' | 'xlsx' | 'txt' | 'unknown'>('unknown');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') setType('pdf');
    else if (ext === 'docx') setType('docx');
    else if (ext === 'xlsx' || ext === 'xls') setType('xlsx');
    else if (ext === 'txt' || ext === 'md') setType('txt');
    else setType('unknown');
  }, [fileName]);

  useEffect(() => {
    if (!isOpen) return;
    
    // Container-Element prüfen und warten falls nötig
    const initializePreview = (attempt = 1) => {
      console.log(`🔄 initializePreview attempt ${attempt}:`, {
        hasContainer: !!containerRef.current,
        isOpen
      });
      
      if (!containerRef.current) {
        if (attempt < 10) {
          console.log(`⏳ Container not ready, retrying in 100ms (attempt ${attempt}/10)`);
          setTimeout(() => initializePreview(attempt + 1), 100);
          return;
        } else {
          console.error('❌ Container never became available after 10 attempts');
          setError('Preview container konnte nicht initialisiert werden');
          setLoading(false);
          return;
        }
      }
      
      console.log('✅ Container ready, starting preview load...');
      setLoading(true);
      setError(null);
      containerRef.current.innerHTML = '<!-- Loading preview... -->';
      
      loadPreview();
    };

    const loadPreview = async () => {
      try {
        // Auth-Token für API-Calls hinzufügen
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        if (type === 'docx') {
          console.log('🔄 DOCX Loading:', fileUrl);
          const response = await fetch(fileUrl, { headers });
          console.log('📄 DOCX Response:', response.status, response.statusText);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const blob = await response.blob();
          console.log('📦 DOCX Blob:', blob.size, 'bytes, type:', blob.type);
          
          // KRITISCHE DEBUG-INFO
          console.log('🔍 PRE-RENDER CHECK:', {
            hasContainerRef: !!containerRef.current,
            containerRefType: typeof containerRef.current,
            containerRefValue: containerRef.current,
            blobSize: blob.size,
            blobType: blob.type
          });
          
          console.log('❌ CONDITION NOT MET - Investigating why...');
          
          // DIREKTER MAMMOTH-VERSUCH (ohne Container-Check)
          if (blob.size > 0) {
            console.log('🐘 DIRECT MAMMOTH ATTEMPT: Bypassing container issues');
            try {
              const arrayBuffer = await blob.arrayBuffer();
              console.log('🔄 ArrayBuffer created, size:', arrayBuffer.byteLength);
              
              const result = await mammoth.convertToHtml({ arrayBuffer });
              console.log('🐘 Mammoth conversion result:', {
                hasValue: !!result.value,
                valueLength: result.value?.length || 0,
                preview: result.value?.substring(0, 200) || 'NO VALUE',
                messagesCount: result.messages?.length || 0,
                messages: result.messages
              });
              
              if (result.value) {
                // Versuche Container zu finden und zu setzen
                setTimeout(() => {
                  console.log('⏰ Delayed container check:', {
                    hasContainer: !!containerRef.current,
                    containerRefType: typeof containerRef.current
                  });
                  
                  if (containerRef.current) {
                    console.log('✅ Setting container content via timeout');
                    containerRef.current.innerHTML = `
                      <div style="
                        padding: 20px;
                        font-family: 'Times New Roman', serif;
                        font-size: 14px;
                        line-height: 1.6;
                        color: #000;
                        background: #fff;
                        border: 1px solid #28a745;
                        border-radius: 8px;
                        max-width: 100%;
                        word-wrap: break-word;
                      ">
                        <h3 style="color: #28a745; margin-top: 0;">✅ Dokument erfolgreich geladen (mammoth.js)</h3>
                        <div style="margin-top: 16px;">
                          ${result.value}
                        </div>
                      </div>
                    `;
                    console.log('🎉 Content successfully set! Container innerHTML length:', containerRef.current.innerHTML.length);
                  } else {
                    console.error('❌ Container still not available after timeout');
                  }
                }, 100);
              } else {
                console.error('❌ Mammoth returned no content');
              }
            } catch (mammothError) {
              console.error('❌ Direct mammoth failed:', mammothError);
            }
          }
          
          // ORIGINAL CODE (commented out for now)  
          if (false && containerRef.current && blob.size > 0) {
          } else if (blob.size === 0) {
            throw new Error('DOCX file is empty');
          }
        } else if (type === 'xlsx') {
          const response = await fetch(fileUrl, { headers });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          const wb = XLSX.read(arrayBuffer, { type: 'array' });
          const first = wb.Sheets[wb.SheetNames[0]];
          const html = XLSX.utils.sheet_to_html(first, { 
            id: 'xlsx-preview',
            editable: false 
          });
          if (containerRef.current) {
            containerRef.current.innerHTML = `
              <div style="overflow-x: auto; max-width: 100%;">
                <style>
                  #xlsx-preview { border-collapse: collapse; width: 100%; }
                  #xlsx-preview td, #xlsx-preview th { 
                    border: 1px solid #ddd; 
                    padding: 8px; 
                    text-align: left; 
                  }
                  #xlsx-preview th { background-color: #f2f2f2; }
                </style>
                ${html}
              </div>
            `;
          }
        } else if (type === 'txt') {
          const response = await fetch(fileUrl, { headers });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const text = await response.text();
          if (containerRef.current) {
            containerRef.current.innerHTML = `
              <pre style="white-space: pre-wrap; font-family: monospace; padding: 16px; background: #f8f9fa; border-radius: 4px; line-height: 1.4;">
                ${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
              </pre>
            `;
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden der Vorschau');
      } finally {
        setLoading(false);
      }
    };

    // Preview initialisieren, wenn nicht PDF oder unknown
    console.log('🚀 useEffect triggered:', { type, isOpen, fileUrl });
    
    if (type !== 'pdf' && type !== 'unknown') {
      console.log('🎯 Calling initializePreview for type:', type);
      initializePreview();
    } else {
      console.log('📄 Skipping preview for type:', type);
      setLoading(false);
    }
  }, [type, fileUrl, isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="document-preview-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div 
        className="document-preview-container"
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          width: '90vw',
          height: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          style={{
            padding: '16px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f9fafb'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#1f2937' }}>
              {fileName}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>
              {type.toUpperCase()}-Vorschau
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '8px'
            }}
            title="Schließen"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <div style={{ 
                fontSize: '24px', 
                marginBottom: '16px',
                animation: 'spin 2s linear infinite'
              }}>⏳</div>
              <p>Lade {type.toUpperCase()}-Vorschau...</p>
              <div style={{ 
                width: '200px', 
                height: '4px', 
                backgroundColor: '#e5e7eb', 
                borderRadius: '2px', 
                margin: '16px auto',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: '50%',
                  height: '100%',
                  backgroundColor: '#3b82f6',
                  borderRadius: '2px',
                  animation: 'loading 1.5s ease-in-out infinite'
                }}></div>
              </div>
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
                @keyframes loading {
                  0% { transform: translateX(-100%); }
                  50% { transform: translateX(100%); }
                  100% { transform: translateX(-100%); }
                }
              `}</style>
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center', padding: '50px', color: '#dc2626' }}>
              <div style={{ fontSize: '24px', marginBottom: '16px' }}>⚠️</div>
              <p>Fehler: {error}</p>
              <button 
                onClick={onClose}
                style={{
                  marginTop: '16px',
                  padding: '8px 16px',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Schließen
              </button>
            </div>
          )}

          {type === 'pdf' && !loading && (
            <iframe 
              src={fileUrl}
              style={{ 
                width: '100%', 
                height: '100%', 
                border: 'none',
                minHeight: '600px'
              }}
              title={`PDF Vorschau: ${fileName}`}
            />
          )}

          {type === 'unknown' && !loading && (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <div style={{ fontSize: '24px', marginBottom: '16px' }}>📄</div>
              <p>Vorschau für diesen Dateityp nicht unterstützt.</p>
              <a 
                href={fileUrl} 
                target="_blank" 
                rel="noreferrer"
                style={{
                  display: 'inline-block',
                  marginTop: '16px',
                  padding: '8px 16px',
                  background: '#2563eb',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px'
                }}
              >
                📥 Datei herunterladen
              </a>
            </div>
          )}

          {/* DEBUG: Container Info */}
          {!loading && !error && (
            <div style={{ 
              padding: '10px', 
              backgroundColor: '#f0f9ff', 
              border: '1px solid #0ea5e9',
              marginBottom: '16px',
              fontSize: '12px',
              color: '#0c4a6e'
            }}>
              <strong>🔍 DEBUG:</strong> Type: {type} | Container: {containerRef.current ? 'EXISTS' : 'NULL'} | 
              Content: {containerRef.current?.innerHTML?.length || 0} chars
            </div>
          )}

          {(type === 'docx' || type === 'xlsx' || type === 'txt') && !loading && !error && (
            <div 
              ref={containerRef} 
              style={{ 
                width: '100%', 
                minHeight: '400px',
                backgroundColor: '#ffffff',
                border: '2px dashed #e5e7eb',
                borderRadius: '8px',
                padding: '16px',
                overflow: 'auto'
              }} 
            />
          )}
        </div>
      </div>
    </div>
  );
};
