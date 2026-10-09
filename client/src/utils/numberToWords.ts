export function numberToIndianWords(amount: number): string {
  if (isNaN(amount) || amount <= 0) return 'INR Rupees Zero Only';

  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    let str = '';
    if (n > 19) {
      str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
    } else {
      str += a[n];
    }
    return str;
  };

  const convert = (n: number): string => {
    if (n === 0) return '';
    let str = '';

    if (Math.floor(n / 10000000) > 0) {
      str += convert(Math.floor(n / 10000000)) + 'Crore ';
      n %= 10000000;
    }
    if (Math.floor(n / 100000) > 0) {
      str += convert(Math.floor(n / 100000)) + 'Lakh ';
      n %= 100000;
    }
    if (Math.floor(n / 1000) > 0) {
      str += convert(Math.floor(n / 1000)) + 'Thousand ';
      n %= 1000;
    }
    if (Math.floor(n / 100) > 0) {
      str += convert(Math.floor(n / 100)) + 'Hundred ';
      n %= 100;
    }
    if (n > 0) {
      str += inWords(n);
    }
    return str;
  };

  const integerPart = Math.floor(amount);
  const words = convert(integerPart).trim();
  return `INR Rupees ${words} Only`;
}
