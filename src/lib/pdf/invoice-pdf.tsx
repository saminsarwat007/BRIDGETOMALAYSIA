import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice, Payment, Student } from "@/types/database";

// Use built-in Helvetica family for reliable serverless rendering (no font fetch).
Font.register({
  family: "Helvetica-Bold",
  src: "Helvetica-Bold",
});

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
    padding: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: c.ink,
    backgroundColor: c.paper,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: c.stone,
  },
  brandWrap: {},
  brandLine1: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.4,
  },
  brandLine2: {
    marginTop: 2,
    fontSize: 8,
    color: c.muted,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  invoiceLabel: {
    fontSize: 8,
    color: c.muted,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  invoiceNumber: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginTop: 4,
    color: c.bridge,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 28,
  },
  metaBlock: { flex: 1, paddingRight: 12 },
  metaTitle: {
    fontSize: 8,
    color: c.muted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  metaValue: { fontSize: 11, lineHeight: 1.45 },
  table: {
    marginTop: 28,
    borderTopWidth: 1,
    borderTopColor: c.ink,
  },
  tableHead: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.stone,
  },
  tableHeadText: {
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: c.muted,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: c.stone,
  },
  colDesc: { flex: 4 },
  colQty: { flex: 1, textAlign: "right" },
  colAmt: { flex: 2, textAlign: "right", fontFamily: "Helvetica" },
  totals: {
    marginTop: 16,
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 240,
    paddingVertical: 4,
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 240,
    paddingVertical: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: c.ink,
  },
  grandLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1.5 },
  grandValue: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  notes: {
    marginTop: 36,
    padding: 16,
    backgroundColor: c.cream,
    borderLeftWidth: 3,
    borderLeftColor: c.gold,
  },
  notesTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 },
  // PAID watermark
  stamp: {
    position: "absolute",
    top: 220,
    left: 140,
    width: 320,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 4,
    borderRadius: 8,
    transform: "rotate(-14deg)",
    opacity: 0.18,
    alignItems: "center",
  },
  stampText: {
    fontSize: 48,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 6,
  },
  stampSub: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    marginTop: 4,
  },
  // Payments received block
  paymentsBlock: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#F0F7EF",
    borderLeftWidth: 3,
    borderLeftColor: "#3F7B3F",
  },
  paymentsTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
    color: "#2F5F2F",
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#CFE3CF",
  },
  paymentMeta: { fontSize: 9, color: "#3F5F3F" },
  paymentAmt: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#2F5F2F" },
  receivedTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#3F7B3F",
  },
  refundBlock: {
    marginTop: 14,
    padding: 12,
    backgroundColor: "#FDF6E3",
    borderLeftWidth: 3,
    borderLeftColor: c.gold,
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: c.stone,
    fontSize: 8,
    color: c.muted,
  },
});

interface Props {
  invoice: Invoice;
  student: Student;
  payments?: Payment[];
}

export function InvoicePDF({ invoice, student, payments = [] }: Props) {
  const bankDetails =
    (invoice.field_values as any)?.bank_details ??
    "Bank transfer details available on request — please contact us before paying.";
  const fmt = (n: number) => formatCurrency(n, invoice.currency);
  const subtotal = invoice.line_items.reduce(
    (sum, li) => sum + Number(li.amount) * Number(li.quantity ?? 1),
    0
  );

  const approvedPayments = payments.filter((p) => p.status === "approved");
  const totalReceived = approvedPayments.reduce(
    (s2, p) => s2 + Number(p.amount_received),
    0
  );
  const total = Number(invoice.total_amount);
  const balance = total - totalReceived;

  const fullyPaid =
    invoice.status === "paid" ||
    invoice.status === "overpaid" ||
    (approvedPayments.length > 0 && balance <= 0);
  const stampColor =
    invoice.status === "overpaid"
      ? c.gold
      : fullyPaid
      ? "#3F7B3F"
      : invoice.status === "partially_paid"
      ? c.gold
      : null;
  const stampLabel =
    invoice.status === "overpaid"
      ? "OVERPAID"
      : fullyPaid
      ? "PAID"
      : invoice.status === "partially_paid"
      ? "PARTIAL"
      : null;

  return (
    <Document title={`Invoice ${invoice.invoice_number}`} author="Bridge to Malaysia">
      <Page size="A4" style={s.page}>
        {stampLabel && stampColor && (
          <View style={[s.stamp, { borderColor: stampColor }]} fixed>
            <Text style={[s.stampText, { color: stampColor }]}>{stampLabel}</Text>
            <Text style={[s.stampSub, { color: stampColor }]}>
              {formatDate(approvedPayments[0]?.payment_date ?? invoice.updated_at).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={s.header}>
          <View style={s.brandWrap}>
            <Text style={s.brandLine1}>Bridge to Malaysia</Text>
            <Text style={s.brandLine2}>Bangladesh → Malaysia</Text>
            <Text style={{ marginTop: 14, fontSize: 9, color: c.muted, lineHeight: 1.5 }}>
              Bangladesh: +880 1749 913165{"\n"}
              Malaysia: +60 113 738 9873{"\n"}
              bridgetomalaysiabd@gmail.com
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.invoiceLabel}>Invoice</Text>
            <Text style={s.invoiceNumber}>{invoice.invoice_number}</Text>
            <Text style={{ fontSize: 9, color: c.muted, marginTop: 4 }}>
              Issued {formatDate(invoice.created_at)}
            </Text>
            {invoice.due_date && (
              <Text style={{ fontSize: 9, color: c.muted, marginTop: 2 }}>
                Due {formatDate(invoice.due_date)}
              </Text>
            )}
          </View>
        </View>

        <View style={s.metaRow}>
          <View style={s.metaBlock}>
            <Text style={s.metaTitle}>Billed to</Text>
            <Text style={[s.metaValue, { fontFamily: "Helvetica-Bold" }]}>
              {student.full_name}
            </Text>
            {student.passport_no && (
              <Text style={s.metaValue}>Passport: {student.passport_no}</Text>
            )}
            {student.email && <Text style={s.metaValue}>{student.email}</Text>}
            {student.phone && <Text style={s.metaValue}>{student.phone}</Text>}
            {student.address && (
              <Text style={[s.metaValue, { marginTop: 4 }]}>{student.address}</Text>
            )}
          </View>
          <View style={s.metaBlock}>
            <Text style={s.metaTitle}>For</Text>
            <Text style={[s.metaValue, { fontFamily: "Helvetica-Bold" }]}>
              {invoice.invoice_type}
            </Text>
            {student.university && (
              <Text style={s.metaValue}>{student.university}</Text>
            )}
            {student.campus && <Text style={s.metaValue}>{student.campus}</Text>}
            {student.intake && (
              <Text style={s.metaValue}>Intake: {student.intake}</Text>
            )}
          </View>
        </View>

        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={[s.colDesc, s.tableHeadText]}>Description</Text>
            <Text style={[s.colQty, s.tableHeadText]}>Qty</Text>
            <Text style={[s.colAmt, s.tableHeadText]}>Amount</Text>
          </View>
          {invoice.line_items.map((li, i) => (
            <View key={i} style={s.row}>
              <Text style={s.colDesc}>{li.description}</Text>
              <Text style={s.colQty}>{li.quantity ?? 1}</Text>
              <Text style={s.colAmt}>
                {fmt(Number(li.amount) * Number(li.quantity ?? 1))}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text style={{ color: c.muted }}>Subtotal</Text>
            <Text>{fmt(subtotal)}</Text>
          </View>
          <View style={s.grandTotal}>
            <Text style={s.grandLabel}>
              {fullyPaid ? "Total" : "Total due"}
            </Text>
            <Text style={s.grandValue}>{fmt(total)}</Text>
          </View>
        </View>

        {approvedPayments.length > 0 && (
          <View style={s.paymentsBlock}>
            <Text style={s.paymentsTitle}>Payments received</Text>
            {approvedPayments.map((p, i) => (
              <View key={i} style={s.paymentRow}>
                <View>
                  <Text style={s.paymentMeta}>
                    {formatDate(p.payment_date)}
                    {p.payment_method ? ` · ${p.payment_method}` : ""}
                  </Text>
                  {p.bank_reference && (
                    <Text style={[s.paymentMeta, { fontSize: 8, marginTop: 2 }]}>
                      Ref: {p.bank_reference}
                    </Text>
                  )}
                </View>
                <Text style={s.paymentAmt}>{fmt(Number(p.amount_received))}</Text>
              </View>
            ))}
            <View style={s.receivedTotal}>
              <Text style={[s.paymentsTitle, { marginBottom: 0 }]}>Total received</Text>
              <Text style={[s.paymentAmt, { fontSize: 13 }]}>{fmt(totalReceived)}</Text>
            </View>
            {balance > 0 && (
              <View style={[s.receivedTotal, { borderTopColor: c.gold }]}>
                <Text style={[s.paymentsTitle, { color: c.bridge, marginBottom: 0 }]}>Balance due</Text>
                <Text style={[s.paymentAmt, { color: c.bridge }]}>{fmt(balance)}</Text>
              </View>
            )}
            {balance < 0 && (
              <View style={s.refundBlock}>
                <Text style={{ fontSize: 10, color: c.ink, lineHeight: 1.5 }}>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>Overpayment: </Text>
                  {fmt(Math.abs(balance))} will be returned or applied to the next invoice.
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={s.notes}>
          <Text style={s.notesTitle}>Payment instructions</Text>
          <Text style={{ fontSize: 10, lineHeight: 1.5, fontFamily: "Courier" }}>
            {bankDetails}
          </Text>
          <Text style={{ fontSize: 9, color: c.muted, marginTop: 10 }}>
            Please reference <Text style={{ fontFamily: "Helvetica-Bold" }}>{invoice.invoice_number}</Text> with your transfer so we can match your payment.
            Once paid, upload your receipt via your tracking page.
          </Text>
        </View>

        <View style={s.footer} fixed>
          <Text>Bridge to Malaysia · bridgetomalaysiabd@gmail.com</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
