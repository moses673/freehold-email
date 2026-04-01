import { useState } from 'react';

export default function DomainVerificationPage() {
  const [domain, setDomain] = useState('');
  const [copied, setCopied] = useState({});

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied({ ...copied, [key]: true });
    setTimeout(() => setCopied({ ...copied, [key]: false }), 2000);
  };

  const RecordCard = ({ title, type, value, explanation, key }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500 mt-1">Type: {type}</p>
        </div>
        <button
          onClick={() => copyToClipboard(value, key)}
          className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition"
        >
          {copied[key] ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <div className="bg-gray-50 p-3 rounded border border-gray-200 break-all">
        <code className="text-xs text-gray-800 font-mono">{value}</code>
      </div>

      <p className="text-sm text-gray-600">{explanation}</p>
    </div>
  );

  const spfRecord = `v=spf1 include:postmarkapp.com ~all`;
  const dkimRecord = `v=DKIM1; k=rsa; p=YOUR_DKIM_PUBLIC_KEY`;
  const dmarcRecord = `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@example.com`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Domain Verification</h1>
        <p className="text-gray-600 mt-2">
          Set up email authentication to improve deliverability and protect your domain from impersonation
        </p>
      </div>

      {/* Domain Input */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Your Domain
        </label>
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="example.com"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
        />
        <p className="text-xs text-gray-500 mt-2">
          This is used in the examples below. Update the DNS records at your domain registrar.
        </p>
      </div>

      {/* Warning Box */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="text-yellow-700 text-lg">⚠️</div>
          <div>
            <h3 className="font-semibold text-yellow-900">Important</h3>
            <p className="text-sm text-yellow-800 mt-1">
              Email deliverability depends on proper DNS configuration. Update these records at your domain registrar (GoDaddy, Namecheap, etc.) before sending campaigns.
            </p>
          </div>
        </div>
      </div>

      {/* SPF Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">SPF (Sender Policy Framework)</h2>
          <p className="text-gray-600">
            SPF allows you to authorize mail servers to send emails on behalf of your domain. It helps prevent email spoofing and forgery.
          </p>
        </div>

        <RecordCard
          title="SPF Record"
          type="TXT"
          value={spfRecord}
          explanation="Add this TXT record to your domain's DNS. This tells email servers that Postmark is authorized to send emails from your domain."
          key="spf"
        />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-blue-900">How to Add SPF:</h4>
          <ol className="text-sm text-blue-900 space-y-2 list-decimal list-inside">
            <li>Log in to your domain registrar</li>
            <li>Find the DNS management section (usually under "DNS Settings" or "Domain Settings")</li>
            <li>Create a new TXT record with the value above</li>
            <li>Wait 24-48 hours for DNS propagation</li>
            <li>Verify the record with Postmark's authentication tools</li>
          </ol>
        </div>
      </div>

      {/* DKIM Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">DKIM (DomainKeys Identified Mail)</h2>
          <p className="text-gray-600">
            DKIM signs your emails with a cryptographic key to prove they're from you. This is the strongest email authentication method and critical for deliverability.
          </p>
        </div>

        <RecordCard
          title="DKIM Public Key Record"
          type="TXT"
          value={dkimRecord}
          explanation="Postmark will provide you with a specific DKIM public key. Use that instead of the placeholder above. Add this as a TXT record in your DNS."
          key="dkim"
        />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-blue-900">Getting Your DKIM Key from Postmark:</h4>
          <ol className="text-sm text-blue-900 space-y-2 list-decimal list-inside">
            <li>Go to Postmark Account Settings → Sender Signatures</li>
            <li>Add your domain and choose "DKIM Authentication"</li>
            <li>Postmark generates a unique DKIM public key for your domain</li>
            <li>Copy the key and add it as a DNS TXT record</li>
            <li>Postmark will verify the record automatically once it's live</li>
          </ol>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-900">
            <strong>Pro Tip:</strong> Many registrars have DKIM configuration wizards. Postmark's documentation includes step-by-step guides for popular registrars like GoDaddy, Namecheap, and DigitalOcean.
          </p>
        </div>
      </div>

      {/* DMARC Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">DMARC (Domain-based Message Authentication)</h2>
          <p className="text-gray-600">
            DMARC ties SPF and DKIM together and tells receiving servers what to do with emails that fail authentication. This is the final piece of email security.
          </p>
        </div>

        <RecordCard
          title="DMARC Policy Record"
          type="TXT (at _dmarc subdomain)"
          value={dmarcRecord}
          explanation="Add this TXT record at _dmarc.yourdomain.com (replace yourdomain.com with your actual domain). Start with 'quarantine' policy and upgrade to 'reject' after monitoring for a week."
          key="dmarc"
        />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-blue-900">DMARC Policy Options:</h4>
          <div className="space-y-2 text-sm text-blue-900">
            <div>
              <strong>p=none</strong> - Monitor only, don't take action (recommended for initial setup)
            </div>
            <div>
              <strong>p=quarantine</strong> - Quarantine failing emails (move to spam)
            </div>
            <div>
              <strong>p=reject</strong> - Reject failing emails (most strict, use after testing)
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-2">DMARC Reporting:</h4>
          <p className="text-sm text-green-900">
            Add <code className="bg-white px-2 py-1 rounded text-xs">rua=mailto:dmarc-reports@yourdomain.com</code> to receive daily reports about emails that fail authentication. This helps you identify problems.
          </p>
        </div>
      </div>

      {/* Verification Checklist */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Verification Checklist</h2>

        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="text-lg">✓</div>
            <div>
              <p className="font-semibold text-gray-900">SPF Record Added</p>
              <p className="text-sm text-gray-600">TXT record with Postmark SPF value</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="text-lg">✓</div>
            <div>
              <p className="font-semibold text-gray-900">DKIM Key Configured</p>
              <p className="text-sm text-gray-600">DKIM public key from Postmark added to DNS</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="text-lg">✓</div>
            <div>
              <p className="font-semibold text-gray-900">DMARC Policy Active</p>
              <p className="text-sm text-gray-600">_dmarc TXT record with policy defined</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="text-lg">✓</div>
            <div>
              <p className="font-semibold text-gray-900">DNS Propagated (24-48 hours)</p>
              <p className="text-sm text-gray-600">Give DNS changes time to propagate globally</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="text-lg">✓</div>
            <div>
              <p className="font-semibold text-gray-900">Verified with Postmark</p>
              <p className="text-sm text-gray-600">Check authentication status in Postmark account</p>
            </div>
          </div>
        </div>
      </div>

      {/* Testing Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Test Your Setup</h2>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Send a Test Email</h3>
            <p className="text-sm text-gray-600 mb-4">
              After configuring SPF and DKIM, send a test email and check:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>Email delivers successfully (not in spam)</li>
              <li>Authentication headers show: SPF=PASS, DKIM=PASS, DMARC=PASS</li>
              <li>Use MXToolbox.com to check your SPF/DKIM records</li>
              <li>Check raw email headers in Gmail: Message → Show original</li>
            </ul>
          </div>

          <div className="bg-gray-50 p-4 rounded border border-gray-200">
            <p className="text-xs text-gray-600">
              <strong>SPF/DKIM/DMARC Check Tools:</strong>
            </p>
            <ul className="text-xs text-gray-600 mt-2 space-y-1">
              <li>• MXToolbox: <code className="bg-white px-1">mxtoolbox.com</code></li>
              <li>• DMARC Analyzer: <code className="bg-white px-1">dmarcian.com</code></li>
              <li>• Google's DMARC Alignment Tool</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Troubleshooting</h2>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900">Emails Going to Spam?</h3>
            <ul className="text-sm text-gray-600 space-y-2 mt-2 list-disc list-inside">
              <li>Ensure SPF, DKIM, and DMARC are all passing</li>
              <li>Verify your sender email is from the authenticated domain</li>
              <li>Check that your email content isn't triggering spam filters</li>
              <li>Monitor bounce rates - high bounces hurt deliverability</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">DNS Records Not Found?</h3>
            <ul className="text-sm text-gray-600 space-y-2 mt-2 list-disc list-inside">
              <li>Wait 24-48 hours for DNS propagation</li>
              <li>Use <code className="bg-gray-100 px-1">nslookup</code> or <code className="bg-gray-100 px-1">dig</code> to test</li>
              <li>Double-check the DNS record format and values</li>
              <li>Ensure you're adding records to the correct zone</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">Still Having Issues?</h3>
            <p className="text-sm text-gray-600 mt-2">
              Postmark has excellent documentation and support. Check their help center or contact their support team - they're very responsive!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
