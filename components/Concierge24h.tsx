/**
 * Concierge 24h — botão fixo (FAB) inferior direito.
 *
 * Lavanda saturada (`--lav-bright`) com texto/ícone em roxo profundo
 * (`--ink-deep`). Abre o WhatsApp em nova aba. Renderizado nas páginas
 * legais (privacy, terms) — quem quiser usar em outras telas, importa
 * este componente e passa label + href.
 */
type Props = { label: string; href: string };

export function Concierge24h({ label, href }: Props) {
  return (
    <a
      className="concierge-fab"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
    >
      <WhatsAppIcon />
      <span>{label}</span>
    </a>
  );
}

function WhatsAppIcon() {
  // Badge style: círculo cheio na cor do texto (--ink-deep) + glifo
  // oficial do WhatsApp em branco. Path do Bootstrap Icons (MIT) — uso
  // de `fillRule="evenodd"` faz o "buraco" no telefone interno aparecer
  // (mostrando o círculo escuro através), reproduzindo a marca.
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="concierge-fab__icon"
    >
      <circle cx="16" cy="16" r="16" fill="var(--lav)" />
      <path
        transform="translate(8 8)"
        fill="#ffffff"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.473.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"
      />
    </svg>
  );
}
