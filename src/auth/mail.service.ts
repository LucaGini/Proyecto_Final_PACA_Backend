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
      <h1>Tu orden ha sido cancelada</h1>
        <p>Lo sentimos mucho</p>
        <p>La orden número <strong>#${orderNumber}</strong> ha sido cancelada.</p>
       <p>Disculpe las molestias ocasionadas. Si tiene alguna pregunta, ¡por favor contáctenos !</p>
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
  
}
