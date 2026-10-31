import React, { useState } from 'react';
import { Terminal, Copy, Check, Sparkles, ExternalLink, ArrowRight } from 'lucide-react';

interface OsCommand {
  label: string;
  id: 'bash' | 'powershell' | 'cmd';
  commands: string;
}

const OS_COMMANDS: OsCommand[] = [
  {
    label: 'macOS / Linux (Bash)',
    id: 'bash',
    commands: `# Clone and setup Exit Capsule
git clone https://github.com/Paritosh2681/H26_Lexacore_Exit-Capsule-Generator.git
cd H26_Lexacore_Exit-Capsule-Generator

# Install backend dependencies
python -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt

# Run CLI dependency scan
python backend/cli.py scan /path/to/your/repo`
  },
  {
    label: 'Windows (PowerShell)',
    id: 'powershell',
    commands: `# Clone and setup Exit Capsule
git clone https://github.com/Paritosh2681/H26_Lexacore_Exit-Capsule-Generator.git
cd H26_Lexacore_Exit-Capsule-Generator

# Create and activate virtual environment
python -m venv .venv; .\\.venv\\Scripts\\Activate.ps1
pip install -r backend\\requirements.txt

# Run CLI dependency scan
python backend\\cli.py scan C:\\path\\to\\your\\repo`
  },
  {
    label: 'Windows (CMD)',
    id: 'cmd',
    commands: `rem Clone and setup Exit Capsule
git clone https://github.com/Paritosh2681/H26_Lexacore_Exit-Capsule-Generator.git
cd H26_Lexacore_Exit-Capsule-Generator

rem Setup virtual environment
python -m venv .venv && .venv\\Scripts\\activate.bat
pip install -r backend\\requirements.txt

rem Run CLI dependency scan
python backend\\cli.py scan C:\\path\\to\\your\\repo`
  }
];

const ECOSYSTEM_STACK = [
  { name: 'Python 3.12+', category: 'Core Runtime' },
  { name: 'FastAPI', category: 'ASGI Framework' },
  { name: 'React 18', category: 'Frontend' },
  { name: 'TypeScript 5.5', category: 'Type Safety' },
  { name: 'Gemma 4', category: 'Open AI Model' },
  { name: 'Google Gemini', category: 'Cloud AI API' },
  { name: 'Ollama', category: 'Local Offline AI' },
  { name: 'PyPI', category: 'Package Registry' },
  { name: 'GitHub OAuth', category: 'Repo Integration' },
  { name: 'SQLite', category: 'Local Storage' }
];

export const DeveloperExperience: React.FC = () => {
  const [activeOs, setActiveOs] = useState<'bash' | 'powershell' | 'cmd'>('powershell');
  const [copied, setCopied] = useState(false);

  const currentCommands = OS_COMMANDS.find(o => o.id === activeOs)?.commands || OS_COMMANDS[0].commands;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCommands);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      id="dx"
      className="ec-chapter"
      style={{
        backgroundColor: 'var(--ec-bg-secondary)',
        position: 'relative',
        paddingBottom: '80px'
      }}
    >
      {/* Ecosystem Tech Strip Marquee */}
      <div style={{
        padding: '24px 0',
        borderBottom: '1px solid var(--ec-border-subtle)',
        marginBottom: '100px',
        overflow: 'hidden',
        backgroundColor: 'var(--ec-bg-card)'
      }}>
        <div className="ec-marquee-track">
          {[...ECOSYSTEM_STACK, ...ECOSYSTEM_STACK].map((item, idx) => (
            <div
              key={`${item.name}-${idx}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0 32px',
                userSelect: 'none'
              }}
            >
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--ec-electric-blue)'
              }} />
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--ec-text-primary)'
              }}>
                {item.name}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                color: 'var(--ec-text-dim)'
              }}>
                ({item.category})
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="ec-container">
        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <span className="ec-badge-mono" style={{ backgroundColor: 'rgba(83, 109, 255, 0.12)', color: 'var(--ec-electric-blue)', border: '1px solid rgba(83, 109, 255, 0.25)' }}>
            CHAPTER 11 // DEVELOPER EXPERIENCE &amp; CLI
          </span>
          <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--ec-border-subtle)' }} />
          <span className="ec-meta-mono">EVIDENCE 11-K</span>
        </div>

        {/* Section Headline */}
        <div style={{ maxWidth: '880px', marginBottom: '40px' }}>
          <h2 className="ec-title-section" style={{ marginBottom: '18px' }}>
            Built to fit the way{' '}
            <span className="ec-editorial-accent" style={{ color: 'var(--ec-electric-blue)' }}>
              developers work.
            </span>
          </h2>
          <p className="ec-body-large">
            Whether you run interactive scans inside the web workbench or automate continuous dependency verification via the CLI in CI/CD pipelines, Exit Capsule meets you where you build.
          </p>
        </div>

        {/* Interactive CLI Terminal Window */}
        <div
          className="ec-card-glass ec-crosshair-box"
          style={{
            borderRadius: 'var(--ec-radius-lg)',
            overflow: 'hidden',
            border: '1px solid var(--ec-border-light)'
          }}
        >
          {/* OS Switcher & Window Controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            backgroundColor: 'var(--ec-bg-card)',
            borderBottom: '1px solid var(--ec-border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#FF5F56' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#FFBD2E' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#27C93F' }} />
              <span style={{ marginLeft: '12px', fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--ec-text-dim)' }}>
                bash / zsh / powershell
              </span>
            </div>

            {/* OS Selector Tabs */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {OS_COMMANDS.map(os => (
                <button
                  key={os.id}
                  onClick={() => setActiveOs(os.id)}
                  data-cursor="OS"
                  style={{
                    padding: '5px 12px',
                    borderRadius: 'var(--ec-radius-sm)',
                    backgroundColor: activeOs === os.id ? 'rgba(83, 109, 255, 0.2)' : 'transparent',
                    border: '1px solid',
                    borderColor: activeOs === os.id ? 'var(--ec-electric-blue)' : 'transparent',
                    color: activeOs === os.id ? 'var(--ec-text-primary)' : 'var(--ec-text-muted)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    cursor: 'pointer'
                  }}
                >
                  {os.label}
                </button>
              ))}
            </div>

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              data-cursor="COPY"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: 'var(--ec-radius-sm)',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--ec-border-light)',
                color: 'var(--ec-text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.74rem',
                cursor: 'pointer'
              }}
            >
              {copied ? <Check size={14} style={{ color: 'var(--ec-emerald)' }} /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy Commands'}</span>
            </button>
          </div>

          {/* Terminal Body */}
          <div style={{
            backgroundColor: 'var(--ec-bg-terminal)',
            padding: '24px 28px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            lineHeight: 1.8,
            color: '#E5E7EB',
            overflowX: 'auto'
          }}>
            <pre style={{ margin: 0 }}>
              <code>{currentCommands}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};

