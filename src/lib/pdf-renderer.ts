import puppeteer from "puppeteer";

export type PdfRenderOptions = {
  format?: "A4" | "Letter";
  landscape?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
};

export async function renderPdfHtml(
  html: string,
  options: PdfRenderOptions = {}
): Promise<Uint8Array> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const pdfBuffer = await page.pdf({
      format: options.format ?? "A4",
      landscape: options.landscape ?? false,
      printBackground: true,
      margin: options.margin ?? {
        top: "22mm",
        right: "18mm",
        bottom: "26mm",
        left: "18mm",
      },
      displayHeaderFooter: Boolean(
        options.headerTemplate || options.footerTemplate
      ),
      headerTemplate: options.headerTemplate ?? "<div></div>",
      footerTemplate: options.footerTemplate ?? "<div></div>",
    });

    return new Uint8Array(pdfBuffer);
  } finally {
    await browser.close();
  }
}
