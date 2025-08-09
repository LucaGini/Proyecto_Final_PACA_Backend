import * as nodemailer from 'nodemailer';
import {config} from 'dotenv'

export class MailService {
  private transporter;

  constructor() {
    config();

    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // Use SSL
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD
      }
    });
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const frontendUrl = 'http://localhost:4200/UserRegistration/new-password';
    const resetUrl = `${frontendUrl}/${token}`;
    const mailOptions = {
      from: process.env.MAIL_USER,
      to: to,
      subject: 'Reestablecer la contraseña',
      html: `
        <h1>Reestablecer la contraseña</h1>
        <p>Has solicitado reestablecer tu contraseña. Haz clic en el botón de abajo para cambiarla:</p>
        <a href="${frontendUrl}?token=${token}" style="background-color: #4CAF50; border: none; color: white; padding: 15px 32px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer;">Cambiar/actualizar contraseña</a>
        <p>Si no has solicitado este cambio, puedes ignorar este correo.</p>

          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            <strong>¡Gracias por elegirnos!</strong><br>
            El equipo de PACA
          </p>
        </div>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendOrderCancellationEmail(to: string, orderNumber: string) {
    const mailOptions = {
      from: process.env.MAIL_USER,
      to: to,
      subject: 'Cancelación de Orden',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">Tu orden ha sido cancelada</h1>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Lo sentimos mucho.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            La orden número <strong>#${orderNumber}</strong> ha sido cancelada.
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-style: italic; color: #666; text-align: center;">
              "Disculpe las molestias ocasionadas."
            </p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Si tiene alguna pregunta, ¡por favor contáctenos!
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555; text-align: center;">
            <strong>Saludos,</strong><br>
            El equipo de PACA
          </p>
        </div>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendOrderCompletionEmail(to: string, orderNumber: string) {
    const mailOptions = {
      from: process.env.MAIL_USER,
      to: to,
      subject: '¡Tu orden ha sido completada!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">¡Tu orden ha sido completada exitosamente!</h1>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            ¡Excelentes noticias!
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            La orden número <strong>#${orderNumber}</strong> ha sido procesada y completada.
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-style: italic; color: #666; text-align: center;">
              "Gracias por confiar en PACA. ¡Esperamos que disfrutes tu compra!"
            </p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555; text-align: center;">
            <strong>¡Gracias por elegirnos!</strong><br>
            El equipo de PACA
          </p>
        </div>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendWelcomeEmail(to: string, firstName: string) {
    const mailOptions = {
      from: process.env.MAIL_USER,
      to: to,
      subject: '¡Bienvenido a PACA!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">¡Bienvenido/a a PACA, ${firstName}!</h1>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Nos alegra tenerte como parte de nuestra comunidad.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Tu cuenta ha sido creada exitosamente y ya puedes comenzar a disfrutar de todos nuestros productos y servicios.
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-style: italic; color: #666; text-align: center;">
              "Bienvenido a una nueva experiencia de compras."
            </p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            ¡Esperamos que tengas una excelente experiencia!
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555; text-align: center;">
            <strong>¡Gracias por elegirnos!</strong><br>
            El equipo de PACA
          </p>
        </div>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendOrderConfirmationEmail(to: string, firstName: string, orderData: {
    orderNumber: string;
    orderDate: Date;
    total: number;
    orderItems: Array<{
      productName: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }>;
    cityName?: string;
    citySurcharge?: number;
  }) {
    const formattedDate = orderData.orderDate.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const itemsHtml = orderData.orderItems.map(item => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px; text-align: left;">${item.productName}</td>
        <td style="padding: 12px; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; text-align: right;">$${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 12px; text-align: right;">$${item.subtotal.toFixed(2)}</td>
      </tr>
    `).join('');

    // Calcular subtotal sin surcharge y el monto del surcharge
    const subtotalWithoutSurcharge = orderData.orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const surchargeAmount = orderData.citySurcharge ? (subtotalWithoutSurcharge * orderData.citySurcharge / 100) : 0;
    
    // Crear filas adicionales para mostrar el desglose del costo
    const surchargeRowHtml = orderData.citySurcharge && orderData.citySurcharge > 0 ? `
      <tr style="border-bottom: 1px solid #eee;">
        <td colspan="3" style="padding: 12px; text-align: right; color: #333;">Subtotal:</td>
        <td style="padding: 12px; text-align: right; color: #333;">$${subtotalWithoutSurcharge.toFixed(2)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #eee;">
        <td colspan="3" style="padding: 12px; text-align: right; color: #333;">Recargo ${orderData.cityName} (${orderData.citySurcharge}%):</td>
        <td style="padding: 12px; text-align: right; color: #333;">$${surchargeAmount.toFixed(2)}</td>
      </tr>
    ` : `
      <tr style="border-bottom: 1px solid #eee;">
        <td colspan="3" style="padding: 12px; text-align: right; color: #333;">Subtotal:</td>
        <td style="padding: 12px; text-align: right; color: #333;">$${subtotalWithoutSurcharge.toFixed(2)}</td>
      </tr>
    `;

    const mailOptions = {
      from: process.env.MAIL_USER,
      to: to,
      subject: '¡Confirmación de tu compra!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">¡Gracias por tu compra, ${firstName}!</h1>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Tu pedido ha sido registrado exitosamente y está siendo procesado.
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Detalles de tu pedido:</h3>
            <p style="margin: 5px 0; color: #555;"><strong>Número de orden:</strong> #${orderData.orderNumber}</p>
            <p style="margin: 5px 0; color: #555;"><strong>Fecha del pedido:</strong> ${formattedDate}</p>
          </div>
          
          <div style="background-color: #fff; border: 1px solid #ddd; border-radius: 8px; margin: 20px 0; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead style="background-color: #f8f9fa;">
                <tr>
                  <th style="padding: 15px; text-align: left; color: #333; border-bottom: 2px solid #ddd;">Producto</th>
                  <th style="padding: 15px; text-align: center; color: #333; border-bottom: 2px solid #ddd;">Cantidad</th>
                  <th style="padding: 15px; text-align: right; color: #333; border-bottom: 2px solid #ddd;">Precio Unit.</th>
                  <th style="padding: 15px; text-align: right; color: #333; border-bottom: 2px solid #ddd;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
                ${surchargeRowHtml}
                <tr style="background-color: #f8f9fa; font-weight: bold;">
                  <td colspan="3" style="padding: 15px; text-align: right; color: #333;">Total:</td>
                  <td style="padding: 15px; text-align: right; color: #333; font-size: 18px;">$${orderData.total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-style: italic; color: #666; text-align: center;">
              "Tu satisfacción es nuestra prioridad."
            </p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Te mantendremos informado sobre el estado de tu pedido. Si tienes alguna pregunta, no dudes en contactarnos.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555; text-align: center;">
            <strong>¡Gracias por confiar en nosotros!</strong><br>
            El equipo de PACA
          </p>
        </div>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendGoodbyeEmail(to: string, firstName: string) {
    const mailOptions = {
      from: process.env.MAIL_USER,
      to: to,
      subject: 'Lamentamos tu partida',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">¡Hasta la vista, ${firstName}!</h1>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Lamentamos la baja de tu cuenta en nuuestro sistema. 
            Fue un placer haberte tenido como parte de nuestra comunidad.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Tu cuenta de usuario quedará <strong>inactiva permanentemente</strong>.
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-style: italic; color: #666; text-align: center;">
              "Las despedidas no son para siempre, son simplemente hasta que nos volvamos a encontrar."
            </p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Gracias por haber sido parte de nuestro proyecto. Te deseamos lo mejor en tus futuros emprendimientos.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555; text-align: center;">
            <strong>¡Que tengas mucho éxito!</strong><br>
            El equipo de PACA
          </p>
        </div>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }
  
  async sendRestockRequestEmail(to: string, productName: string) {
  const mailOptions = {
    from: process.env.MAIL_USER,
    to,
    subject: `Reabastecimiento solicitado para: ${productName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h1 style="color: #333;">Solicitud de Reabastecimiento</h1>
        <p style="font-size: 16px; color: #555;">
          Estimado proveedor,
        </p>
        <p style="font-size: 16px; color: #555;">
          Se ha detectado que el producto <strong>${productName}</strong> necesita ser reabastecido.
        </p>
        <p style="font-size: 16px; color: #555;">
          Le solicitamos por favor revisar el stock y realizar el envío correspondiente lo antes posible.
        </p>
        <p style="font-size: 16px; color: #555;">
          Muchas gracias por su colaboración.
        </p>
        <p style="font-size: 16px; color: #555;">
          Atentamente,<br>
          El equipo de PACA
        </p>
      </div>
    `
  };

  await this.transporter.sendMail(mailOptions);
}
}