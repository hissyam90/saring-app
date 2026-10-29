import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RichContent } from "@/components/pustaka/rich-content";
import type { RichDoc, RichMark } from "@/lib/content/rich-text";

const text = (value: string, marks?: RichMark[]) => ({
  type: "text",
  text: value,
  ...(marks ? { marks } : {}),
});

describe("RichContent: format yang didukung", () => {
  it("merender judul, tebal, miring, daftar, kutipan, dan garis pemisah", () => {
    const doc: RichDoc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [text("Judul bagian")] },
        {
          type: "paragraph",
          content: [text("Teks "), text("tebal", [{ type: "bold" }]), text(" dan "), text("miring", [{ type: "italic" }])],
        },
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [{ type: "paragraph", content: [text("Butir satu")] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [text("Butir dua")] }] },
          ],
        },
        { type: "blockquote", content: [{ type: "paragraph", content: [text("Catatan penting")] }] },
        { type: "horizontalRule" },
      ],
    };

    const { container } = render(<RichContent doc={doc} />);

    expect(screen.getByRole("heading", { level: 2, name: "Judul bagian" })).toBeInTheDocument();
    expect(container.querySelector("strong")).toHaveTextContent("tebal");
    expect(container.querySelector("em")).toHaveTextContent("miring");
    expect(container.querySelectorAll("ul > li")).toHaveLength(2);
    expect(container.querySelector("blockquote")).toHaveTextContent("Catatan penting");
    expect(container.querySelector("hr")).toBeInTheDocument();
  });

  it("merender kode sebaris, garis bawah, dan coret", () => {
    const doc: RichDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            text("kode", [{ type: "code" }]),
            text("bawah", [{ type: "underline" }]),
            text("coret", [{ type: "strike" }]),
          ],
        },
      ],
    };

    const { container } = render(<RichContent doc={doc} />);

    expect(container.querySelector("code")).toHaveTextContent("kode");
    expect(container.querySelector("u")).toHaveTextContent("bawah");
    expect(container.querySelector("s")).toHaveTextContent("coret");
  });

  it("merender tautan aman dengan atribut keamanan", () => {
    const doc: RichDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            text("Sumber resmi", [{ type: "link", attrs: { href: "https://ojk.go.id/edukasi" } }]),
          ],
        },
      ],
    };

    render(<RichContent doc={doc} />);

    const link = screen.getByRole("link", { name: "Sumber resmi" });
    expect(link).toHaveAttribute("href", "https://ojk.go.id/edukasi");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("rel")).toContain("noreferrer");
  });

  it("tidak membuka tab baru untuk tautan mailto", () => {
    const doc: RichDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [text("Email", [{ type: "link", attrs: { href: "mailto:halo@contoh.test" } }])],
        },
      ],
    };

    render(<RichContent doc={doc} />);

    const link = screen.getByRole("link", { name: "Email" });
    expect(link).not.toHaveAttribute("target");
  });
});

describe("RichContent: keamanan", () => {
  it("menampilkan tag HTML sebagai teks, bukan elemen", () => {
    const doc: RichDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [text("<script>alert(1)</script> <img src=x onerror=alert(2)>")],
        },
      ],
    };

    const { container } = render(<RichContent doc={doc} />);

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("<script>alert(1)</script>");
  });

  it("membuang tautan javascript dan tetap menampilkan teksnya", () => {
    const doc: RichDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            text("klik di sini", [
              { type: "link", attrs: { href: "javascript:alert(1)" } },
            ]),
          ],
        },
      ],
    };

    const { container } = render(<RichContent doc={doc} />);

    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toContain("klik di sini");
  });

  it("membuang tautan data: dari data yang sudah tersimpan", () => {
    const doc: RichDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            text("unduh", [
              { type: "link", attrs: { href: "data:text/html;base64,PHNjcmlwdD4=" } },
            ]),
          ],
        },
      ],
    };

    const { container } = render(<RichContent doc={doc} />);
    expect(container.querySelector("a")).toBeNull();
  });

  it("tidak merender node di luar allowlist", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "iframe", attrs: { src: "https://evil.test" } },
        { type: "codeBlock", content: [{ type: "text", text: "x" }] },
        { type: "paragraph", content: [text("aman")] },
      ],
    } as unknown as RichDoc;

    const { container } = render(<RichContent doc={doc} />);

    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector("pre")).toBeNull();
    expect(container.textContent).toBe("aman");
  });

  it("tidak merender gambar dengan src tidak aman", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "image", attrs: { src: "javascript:alert(1)" } },
        { type: "image", attrs: { src: "data:image/png;base64,AAAA" } },
        { type: "image", attrs: { src: "http://contoh.test/x.png" } },
      ],
    } as unknown as RichDoc;

    const { container } = render(<RichContent doc={doc} />);

    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("Gambar tidak dapat ditampilkan");
  });
});

describe("RichContent: kompatibilitas artikel lama", () => {
  it("merender teks biasa bila dokumen tidak tersedia", () => {
    const { container } = render(
      <RichContent
        doc={null}
        fallbackText={"Paragraf pertama.\n\nParagraf kedua dengan <b>tag</b>."}
      />,
    );

    expect(container.querySelectorAll("p")).toHaveLength(2);
    expect(container.querySelector("b")).toBeNull();
    expect(container.textContent).toContain("<b>tag</b>");
  });

  it("tidak merender apa pun bila tidak ada isi", () => {
    const { container } = render(<RichContent doc={null} fallbackText="   " />);
    expect(container).toBeEmptyDOMElement();
  });
});


describe("RichContent: media", () => {
  it("merender gambar dengan atribut yang aman", () => {
    const doc: RichDoc = {
      type: "doc",
      content: [
        {
          type: "image",
          attrs: { src: "https://i.postimg.cc/abcd1234/foto.jpg", alt: "Contoh" },
        },
      ],
    };

    const { container } = render(<RichContent doc={doc} />);
    const img = container.querySelector("img");

    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", "https://i.postimg.cc/abcd1234/foto.jpg");
    expect(img).toHaveAttribute("alt", "Contoh");
    expect(img).toHaveAttribute("loading", "lazy");
    // Host gambar menolak hotlink bila Referer asing dikirim (403).
    expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(img?.className).toContain("max-w-full");
    expect(img?.className).toContain("h-auto");
  });

  it("merender gambar dari hosting HTTPS lain tanpa ekstensi", () => {
    const doc: RichDoc = {
      type: "doc",
      content: [
        { type: "image", attrs: { src: "https://cdn.contoh.test/gambar/12345" } },
      ],
    };

    const { container } = render(<RichContent doc={doc} />);
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://cdn.contoh.test/gambar/12345",
    );
  });

  it("merender embed media sebagai iframe resmi dengan sandbox", () => {
    const doc: RichDoc = {
      type: "doc",
      content: [{ type: "mediaEmbed", attrs: { provider: "imgur", id: "l4mKcOj" } }],
    };

    const { container } = render(<RichContent doc={doc} />);
    const iframe = container.querySelector("iframe");

    expect(iframe).toHaveAttribute(
      "src",
      "https://imgur.com/a/l4mKcOj/embed?pub=true",
    );
    expect(iframe).toHaveAttribute("referrerpolicy", "no-referrer");
    const sandbox = iframe?.getAttribute("sandbox") ?? "";
    expect(sandbox).toContain("allow-scripts");
    expect(sandbox).not.toContain("allow-top-navigation");

    // Tautan keluar yang aman selalu tersedia sebagai fallback.
    const link = screen.getByRole("link", { name: /Buka di imgur/i });
    expect(link).toHaveAttribute("href", "https://imgur.com/a/l4mKcOj");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("rel")).toContain("noreferrer");
  });

  it("tidak merender embed dengan provider atau id tidak valid", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "mediaEmbed", attrs: { provider: "evil", id: "l4mKcOj" } },
        { type: "mediaEmbed", attrs: { provider: "imgur" } },
      ],
    } as unknown as RichDoc;

    const { container } = render(<RichContent doc={doc} />);
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("menampilkan fallback saat gambar gagal dimuat", () => {
    const doc: RichDoc = {
      type: "doc",
      content: [
        {
          type: "image",
          attrs: { src: "https://i.imgur.com/tidakada.jpg", alt: "Rusak" },
        },
      ],
    };

    const { container } = render(<RichContent doc={doc} />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();

    // Simulasikan kegagalan muat berkas. \`fireEvent.error\` dipakai karena
    // React mendengarkan event media di root, bukan pada elemen.
    fireEvent.error(img as HTMLImageElement);

    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("Gambar gagal dimuat");
    const fallbackLink = screen.getByRole("link", { name: /Buka gambar asli/i });
    expect(fallbackLink).toHaveAttribute(
      "href",
      "https://i.imgur.com/tidakada.jpg",
    );
    expect(fallbackLink.getAttribute("rel")).toContain("noopener");
  });
});
