import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";
import { createElement } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Contract, Student } from "@/types/database";

Font.register({ family: "Helvetica-Bold", src: "Helvetica-Bold" });

const c = {
  ink: "#1F1410",
  bridge: "#8B5A2B",
  gold: "#C8932B",
  muted: "#8C7B6A",
  paper: "#FBF7EF",
  cream: "#F5EFE4",
  stone: "#D9CDB8",
};

const s = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 80,
    paddingHorizontal: 56,
    fontFamily: "Helvetica",
    fontSize: 10.5,
    lineHeight: 1.55,
    color: c.ink,
    backgroundColor: c.paper,
  },
  // Header
  brand: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.stone,
  },
  brandName: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.6,
  },
  brandSub: {
    marginTop: 2,
    fontSize: 8,
    color: c.muted,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  brandAddr: {
    fontSize: 9,
    color: c.muted,
    lineHeight: 1.5,
    marginTop: 10,
  },
  dateBlock: {
    alignItems: "flex-end",
  },
  dateLabel: { fontSize: 8, color: c.muted, letterSpacing: 2, textTransform: "uppercase" },
  dateValue: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 4 },
  contractRef: { fontSize: 9, color: c.bridge, marginTop: 8, fontFamily: "Helvetica-Bold" },
  // Title
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    letterSpacing: 4,
    marginTop: 28,
    color: c.ink,
  },
  titleRule: {
    height: 2,
    width: 60,
    backgroundColor: c.gold,
    marginTop: 12,
    alignSelf: "center",
  },
  // Parties
  partiesGrid: {
    flexDirection: "row",
    marginTop: 28,
    gap: 22,
  },
  party: { flex: 1 },
  partyLabel: {
    fontSize: 8,
    color: c.muted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  partyName: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  partyMeta: { fontSize: 10, marginTop: 4 },
  // Sections
  section: { marginTop: 26 },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    textTransform: "uppercase",
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: c.ink,
    marginBottom: 10,
  },
  body: { fontSize: 10.5, lineHeight: 1.6 },
  bullet: {
    flexDirection: "row",
    marginTop: 6,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 14,
    fontSize: 10,
    color: c.bridge,
  },
  bulletText: { flex: 1, fontSize: 10.5, lineHeight: 1.55 },
  // Numbers / financial block
  financial: {
    marginTop: 12,
    padding: 14,
    backgroundColor: c.cream,
    borderLeftWidth: 3,
    borderLeftColor: c.gold,
  },
  finRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  finLabel: { fontSize: 10, color: c.ink },
  finValue: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  // Signatures
  signaturesRow: {
    flexDirection: "row",
    gap: 36,
    marginTop: 48,
  },
  sigBox: { flex: 1 },
  sigLine: {
    height: 1,
    backgroundColor: c.ink,
    marginBottom: 6,
  },
  sigImage: {
    height: 56,
    marginBottom: 4,
    objectFit: "contain",
    alignSelf: "flex-start",
  },
  sigLabel: { fontSize: 9, color: c.muted, textTransform: "uppercase", letterSpacing: 1.2 },
  sigName: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 6 },
  sigRole: { fontSize: 9, color: c.muted, marginTop: 1 },
  // Footer
  footer: {
    position: "absolute",
    bottom: 32,
    left: 56,
    right: 56,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: c.stone,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerLeft: { fontSize: 8, color: c.muted, lineHeight: 1.5 },
  footerTagline: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: c.bridge,
    letterSpacing: 1.5,
  },
  footerPage: { fontSize: 8, color: c.muted },
});

interface Props {
  contract: Contract;
  student: Student;
}

export function ContractPDF({ contract, student }: Props) {
  const f = contract.field_values as Record<string, any>;

  // Field values (with sensible defaults derived from student record)
  const clientName = f.client_name ?? student.full_name;
  const clientPassport = f.client_passport ?? student.passport_no ?? "—";
  const clientAddress = f.client_address ?? student.address ?? "—";
  const providerName = f.provider_name ?? "Huzaifa Saoman";
  const providerAddress =
    f.provider_address ?? "191, Jalan Impian Emas 59, Taman Impian Emas, 81300 Skudai, Johor, Malaysia";
  const services: string[] = Array.isArray(f.services)
    ? f.services
    : ["University application", "EMGS", "eVisa", "Flight ticketing", "Airport pickup"];
  const currency: string = f.currency ?? "BDT";
  const totalAmount: number = Number(f.total_amount ?? 0);
  const securityDeposit: number = Number(f.security_deposit ?? 3000);
  const universityFee: string = f.university_fee ?? "RM 450";
  const startDate: string = f.start_date ?? new Date().toISOString().slice(0, 10);
  const signatoryName: string = f.signatory_name ?? "Huzaifa Saoman";
  const signatoryRole: string = f.signatory_role ?? "CMO and Co-founder";
  const signatureDate: string = f.signature_date ?? new Date().toISOString().slice(0, 10);
  const contractDate: string = f.contract_date ?? new Date().toISOString().slice(0, 10);
  const customClauses: string = f.custom_clauses ?? "";
  const signatureImage: string | undefined = f.signature_image; // data:image/... or https://...

  return (
    <Document
      title={`Contract ${contract.contract_number}`}
      author="Bridge to Malaysia"
      subject={`Service agreement with ${clientName}`}
    >
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.brand}>
          <View>
            <Text style={s.brandName}>Bridge to Malaysia</Text>
            <Text style={s.brandSub}>Bangladesh → Malaysia</Text>
            <Text style={s.brandAddr}>
              191, Jalan Impian Emas 59, Taman Impian Emas{"\n"}
              81300 Skudai, Johor, Malaysia{"\n"}
              +60 113 738 9873 · bridgetomalaysiabd@gmail.com
            </Text>
          </View>
          <View style={s.dateBlock}>
            <Text style={s.dateLabel}>Date</Text>
            <Text style={s.dateValue}>{formatDate(contractDate)}</Text>
            <Text style={s.contractRef}>{contract.contract_number}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={s.title}>LETTERHEAD AGREEMENT</Text>
        <View style={s.titleRule} />

        {/* Parties */}
        <View style={s.partiesGrid}>
          <View style={s.party}>
            <Text style={s.partyLabel}>Between · Client</Text>
            <Text style={s.partyName}>{clientName.toUpperCase()}</Text>
            <Text style={s.partyMeta}>Passport: {clientPassport}</Text>
            <Text style={[s.partyMeta, { marginTop: 4 }]}>{clientAddress}</Text>
          </View>
          <View style={s.party}>
            <Text style={s.partyLabel}>Service Provider</Text>
            <Text style={s.partyName}>{providerName}</Text>
            <Text style={[s.partyMeta, { marginTop: 4 }]}>{providerAddress}</Text>
          </View>
        </View>

        {/* Services */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Services</Text>
          <Text style={s.body}>
            The Service Provider agrees to provide the following chosen services to the Client:
          </Text>
          {services.map((svc, i) => (
            <View key={i} style={s.bullet}>
              <Text style={s.bulletDot}>•</Text>
              <Text style={s.bulletText}>{svc}</Text>
            </View>
          ))}
        </View>

        {/* Payment */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Payment</Text>
          <Text style={s.body}>
            The Client agrees to pay the Service Provider the total of{" "}
            <Text style={{ fontFamily: "Helvetica-Bold" }}>
              {formatCurrency(totalAmount, currency)}
            </Text>{" "}
            for the above-listed services. Payment terms are as follows:
          </Text>

          <View style={s.financial}>
            <View style={s.finRow}>
              <Text style={s.finLabel}>Refundable security deposit</Text>
              <Text style={s.finValue}>{formatCurrency(securityDeposit, currency)}</Text>
            </View>
            <View style={s.finRow}>
              <Text style={s.finLabel}>University application fee (non-refundable)</Text>
              <Text style={s.finValue}>{universityFee}</Text>
            </View>
          </View>

          <View style={s.bullet}>
            <Text style={s.bulletDot}>•</Text>
            <Text style={s.bulletText}>
              A refundable deposit of{" "}
              <Text style={{ fontFamily: "Helvetica-Bold" }}>
                {formatCurrency(securityDeposit, currency)}
              </Text>{" "}
              must be paid to initiate a seamless procession of service. This deposit will be refunded
              upon the conclusion of the chosen services given that the student successfully enrolls
              in his/her chosen institution and pays the respective tuition fee.
            </Text>
          </View>
          <View style={s.bullet}>
            <Text style={s.bulletDot}>•</Text>
            <Text style={s.bulletText}>
              The Client agrees to pay an Application Fee of{" "}
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{universityFee}</Text> to the University.
              This fee is non-refundable, even in the event of application rejection.
            </Text>
          </View>
          <View style={s.bullet}>
            <Text style={s.bulletDot}>•</Text>
            <Text style={s.bulletText}>
              Full payment must be completed after the e-Visa Approval Letter (eVAL) issuance and before
              the Client arrives in Malaysia.
            </Text>
          </View>
          <View style={s.bullet}>
            <Text style={s.bulletDot}>•</Text>
            <Text style={s.bulletText}>
              If the Client breaches the aforementioned clause, the company holds all the rights to take
              the relevant and necessary action as per the Immigration Laws of Malaysia including
              reporting to immigration authorities.
            </Text>
          </View>
        </View>

        {/* Term */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Term</Text>
          <Text style={s.body}>
            The services shall begin on{" "}
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{formatDate(startDate)}</Text> and shall be
            completed by concluding the chosen service(s) for the Client unless otherwise agreed upon in
            writing by both parties.
          </Text>
          <View style={s.bullet}>
            <Text style={s.bulletDot}>•</Text>
            <Text style={s.bulletText}>
              The student must fulfill the English proficiency requirements as per the university's
              terms.
            </Text>
          </View>
          <View style={s.bullet}>
            <Text style={s.bulletDot}>•</Text>
            <Text style={s.bulletText}>
              The agency is not responsible for the time taken for EMGS processing.
            </Text>
          </View>
          <View style={s.bullet}>
            <Text style={s.bulletDot}>•</Text>
            <Text style={s.bulletText}>
              If the Client wishes to no longer pursue his/her chosen services with Bridge to Malaysia —
              Bangladesh, the company holds all the rights to claim full possession of the deposit paid
              earlier.
            </Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Termination</Text>
          <Text style={s.body}>
            Either party may terminate this agreement within three months of two prior written notices.
            Upon termination, the Client shall pay for any completed work and any reasonable expenses
            incurred before termination.
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Confidentiality</Text>
          <Text style={s.body}>
            Both parties agree to keep any confidential information shared during this agreement private
            and secure.
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Amendments</Text>
          <Text style={s.body}>
            Any amendments or changes to this agreement must be in writing and signed by both parties.
          </Text>
        </View>

        {customClauses?.trim() && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Additional clauses</Text>
            <Text style={s.body}>{customClauses}</Text>
          </View>
        )}

        {/* Signatures */}
        <View style={s.signaturesRow} wrap={false}>
          <View style={s.sigBox}>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>Client</Text>
            <Text style={s.sigName}>{clientName.toUpperCase()}</Text>
            <Text style={s.sigRole}>Date: ____________________</Text>
          </View>
          <View style={s.sigBox}>
            {signatureImage ? (
              createElement(Image, { src: signatureImage, style: s.sigImage })
            ) : null}
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>Service Provider</Text>
            <Text style={s.sigName}>{signatoryName.toUpperCase()}</Text>
            <Text style={s.sigRole}>{signatoryRole}</Text>
            <Text style={s.sigRole}>Date: {formatDate(signatureDate)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerLeft}>
            +880 1749 913165 · +60 113 738 9873{"\n"}
            bridgetomalaysiabd@gmail.com
          </Text>
          <Text style={s.footerTagline}>FOR YOU. BY US.</Text>
          <Text style={s.footerPage} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
