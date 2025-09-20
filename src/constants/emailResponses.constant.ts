export default {
  OTP_SENDER_MESSAGE: (OTP: string, expireyTime?: string): string => {
    const message = `<br>Thank you for registering with us, now you have to verify your account. Please use this OTP <span style="font-weight:bold; color:blue;">${OTP}</span> to verify your account.<br/> If you did not request this , please ignore it.<br>${expireyTime ? `<span style="text-align:center; color:red; display:block;font-weight:bold;"><i>Link is valid for ${expireyTime}m</i></span>` : ""}`;
    return message;
  },

  SEND_OTP_FOR_RESET_PASSWORD_REQUEST: (OTP: string, expireyTime?: string): string => {
    const message = `<br>Thank you for Password reset Request. Please Click  <a href="${OTP}" target="_blank">here</a> to reset your password. If you did not request this , please ignore it.<br>${expireyTime ? `<span style="text-align:center; color:red; display:block;font-weight:bold;"><i>Link is valid for ${expireyTime}m</i></span>` : ""}`;
    return message;
  }
};
