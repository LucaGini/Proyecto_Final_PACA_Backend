import PDFDocument from 'pdfkit';
import { Order } from './order.entity.js';
import fs from 'fs';
import path from 'path';

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export class InvoiceService {
  async generateInvoice(order: Order, items: InvoiceItem[], cityName?: string, citySurcharge?: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (buffer) => buffers.push(buffer));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      this.generateHeader(doc);
      this.generateCustomerInformation(doc, order, cityName);
      const finalY = this.generateInvoiceTable(doc, order, items, citySurcharge);
      this.generateFooter(doc, finalY);

      doc.end();
    });
  }

  private generateHeader(doc: PDFKit.PDFDocument) {
    const logoPath = path.join(process.cwd(), 'src', 'assets', 'paca-logo.png'); // Try generic name
    // If not found, maybe list directory to find it? For now assume logo.png or similar.
    // Ideally I would find the file first. 

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 50 });
      doc
        .fillColor('#444444')
        .fontSize(20)
        .text('Cooperativa P.A.CA', 110, 65);
    } else {
      // Fallback or just text
      doc.fillColor('#444444')
        .fontSize(20)
        .text('Cooperativa P.A.CA', 50, 65);
    }

    doc
      .fillColor('#444444')
      .fontSize(10)
      .text('Zeballos 1341', 200, 65, { align: 'right' })
      .text('S2000BQA Rosario, Santa Fe, Argentina', 200, 80, { align: 'right' })
      .moveDown();
  }

  private generateCustomerInformation(doc: PDFKit.PDFDocument, order: Order, cityName?: string) {
    const user = order.user;
    const userName = user ? `${user.firstName} ${user.lastName}` : 'Cliente';
    const userEmail = user?.email || '';
    const userStreet = user?.street || '';
    const userNumber = user?.streetNumber || '';
    const city = cityName || user?.city?.name || '';
    const fullAddress = `${userStreet} ${userNumber}, ${city}`;

    doc
      .fillColor('#444444')
      .fontSize(20)
      .text('Factura', 50, 160);

    this.generateHr(doc, 185);

    const customerInformationTop = 200;

    doc
      .fontSize(10)
      .text('Orden Nro:', 50, customerInformationTop)
      .font('Helvetica-Bold')
      .text(order.orderNumber, 150, customerInformationTop)
      .font('Helvetica')
      .text('Fecha de emisión:', 50, customerInformationTop + 15)
      .text(this.formatDate(order.orderDate || new Date()), 150, customerInformationTop + 15)
      .text('Monto Total:', 50, customerInformationTop + 30)
      .text(`$${order.total.toFixed(2)}`, 150, customerInformationTop + 30)

      .font('Helvetica-Bold')
      .text(userName, 300, customerInformationTop)
      .font('Helvetica')
      .text(userEmail, 300, customerInformationTop + 15)
      .text(fullAddress, 300, customerInformationTop + 30)
      .moveDown();

    this.generateHr(doc, 252);
  }

  private generateInvoiceTable(doc: PDFKit.PDFDocument, order: Order, items: InvoiceItem[], citySurcharge: number = 0): number {
    let i = 0;
    const invoiceTableTop = 330;
    let y = invoiceTableTop;

    doc.font('Helvetica-Bold');
    this.generateTableRow(
      doc,
      y,
      'Item/Producto',
      'Precio Unit.',
      'Cant.',
      'Total'
    );
    this.generateHr(doc, y + 20);
    doc.font('Helvetica');
    y += 30;

    for (const item of items) {
      // Check for page break
      if (y > 700) {
        doc.addPage();
        y = 50; // Reset to top
        // Optional: Repeat header?
      }

      this.generateTableRow(
        doc,
        y,
        item.productName,
        `$${item.unitPrice.toFixed(2)}`,
        item.quantity.toString(),
        `$${item.subtotal.toFixed(2)}`
      );

      this.generateHr(doc, y + 20);
      y += 30;
      i++;
    }

    // Calculate values
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const surchargeAmount = citySurcharge > 0 ? (subtotal * citySurcharge / 100) : 0;

    // Check space for totals (need approx 3-4 lines ~ 100pts)
    if (y > 650) {
      doc.addPage();
      y = 50;
    }

    // Show Subtotal
    this.generateTableRow(
      doc,
      y,
      '',
      '',
      'Subtotal',
      `$${subtotal.toFixed(2)}`
    );
    y += 25;

    // Show Surcharge if applicable
    if (citySurcharge > 0) {
      this.generateTableRow(
        doc,
        y,
        '',
        '',
        `Recargo ${citySurcharge}%`,
        `$${surchargeAmount.toFixed(2)}`
      );
      y += 25;
    }

    doc.font('Helvetica-Bold');
    this.generateTableRow(
      doc,
      y,
      '',
      '',
      'Total',
      `$${order.total.toFixed(2)}`
    );

    return y;
  }

  private generateTableRow(
    doc: PDFKit.PDFDocument,
    y: number,
    item: string,
    unitCost: string,
    quantity: string,
    lineTotal: string
  ) {
    doc
      .fontSize(10)
      .text(item, 50, y, { width: 230 })
      .text(unitCost, 280, y, { width: 90, align: 'right' })
      .text(quantity, 370, y, { width: 80, align: 'right' })
      .text(lineTotal, 0, y, { align: 'right' });
  }

  private generateHr(doc: PDFKit.PDFDocument, y: number) {
    doc
      .strokeColor('#aaaaaa')
      .lineWidth(1)
      .moveTo(50, y)
      .lineTo(550, y)
      .stroke();
  }

  private generateFooter(doc: PDFKit.PDFDocument, startY: number) {
    // Footer relative to end of content, but check for page end
    let footerY = startY + 50;

    if (footerY > doc.page.height - 50) {
      doc.addPage();
      footerY = 50;
    }

    doc
      .fontSize(10)
      .text(
        'Gracias por su compra en PACA.',
        50,
        footerY,
        { align: 'center', width: 500 }
      );
  }

  private formatDate(date: Date) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }
}
