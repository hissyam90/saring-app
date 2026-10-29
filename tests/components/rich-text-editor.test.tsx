import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RichTextEditor } from "@/components/komunitas/rich-text-editor";
import type { RichDoc } from "@/lib/content/rich-text";

const initialDoc: RichDoc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Judul bagian" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Teks tebal", marks: [{ type: "bold" }] },
        { type: "text", text: " dan " },
        {
          type: "text",
          text: "tautan",
          marks: [{ type: "link", attrs: { href: "https://ojk.go.id/" } }],
        },
      ],
    },
  ],
};

function renderEditor(initial: RichDoc | null = initialDoc) {
  return render(<RichTextEditor initialDoc={initial} onChange={() => {}} />);
}

describe("RichTextEditor", () => {
  it("menampilkan toolbar dengan label aksesibel yang lengkap", () => {
    renderEditor();

    for (const label of [
      "Paragraf biasa",
      "Judul tingkat 2",
      "Judul tingkat 3",
      "Tebal",
      "Miring",
      "Garis bawah",
      "Coret",
      "Kode sebaris",
      "Daftar butir",
      "Daftar bernomor",
      "Kutipan",
      "Garis pemisah",
      "Sisipkan atau ubah tautan",
      "Urungkan",
      "Ulangi",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("merender isi awal dengan format yang tersimpan", () => {
    const { container } = renderEditor();

    expect(container.querySelector("h2")).toHaveTextContent("Judul bagian");
    expect(container.querySelector("strong")).toHaveTextContent("Teks tebal");
    expect(container.querySelector("a")).toHaveAttribute("href", "https://ojk.go.id/");
  });

  it("menandai format aktif sesuai posisi kursor", async () => {
    renderEditor();

    // Kursor awal berada di judul H2.
    const h2 = screen.getByRole("button", { name: "Judul tingkat 2" });
    expect(h2).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Paragraf biasa" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Paragraf biasa" }));

    expect(screen.getByRole("button", { name: "Paragraf biasa" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("menjalankan perintah format saat tombol diklik", async () => {
    const user = userEvent.setup();
    const { container } = renderEditor();

    await user.click(screen.getByRole("button", { name: "Tebal" }));
    expect(screen.getByRole("button", { name: "Tebal" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Miring" }));
    await user.click(screen.getByRole("button", { name: "Daftar butir" }));

    // Daftar butir harus benar-benar terbentuk di dokumen editor.
    expect(container.querySelector(".saring-editor ul")).not.toBeNull();
  });

  it("menampilkan penghitung karakter dan hint", () => {
    renderEditor();

    expect(screen.getByText(/karakter$/)).toBeInTheDocument();
    expect(screen.getByText(/Minimal 300 karakter/i)).toBeInTheDocument();
  });

  it("membuka dialog tautan dan menolak URL berbahaya tanpa menyimpan", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole("button", { name: "Sisipkan atau ubah tautan" }));

    const input = screen.getByLabelText("Alamat tautan");
    await user.clear(input);
    await user.type(input, "javascript:alert(1)");
    await user.click(screen.getByRole("button", { name: "Sisipkan" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/https:\/\//i);
  });

  it("menyisipkan tautan aman ke dalam dokumen", async () => {
    const user = userEvent.setup();
    const { container } = renderEditor();

    await user.click(screen.getByRole("button", { name: "Sisipkan atau ubah tautan" }));
    const input = screen.getByLabelText("Alamat tautan");
    await user.clear(input);
    await user.type(input, "contoh.go.id/panduan");
    await user.click(screen.getByRole("button", { name: "Sisipkan" }));

    const links = [...container.querySelectorAll(".saring-editor a")].map((a) =>
      a.getAttribute("href"),
    );
    expect(links).toContain("https://contoh.go.id/panduan");
  });
});

describe("RichTextEditor: area menulis", () => {
  it("memakai shell ber-min-height agar area kosong tetap luas", () => {
    const { container } = renderEditor(null);

    const shell = container.querySelector(".saring-editor-shell");
    expect(shell).not.toBeNull();

    const editor = container.querySelector("#artikel-editor");
    expect(editor).not.toBeNull();
    expect(editor?.className).toContain("saring-editor");
  });

  it("menampilkan toolbar media tanpa menghapus tombol format lain", () => {
    renderEditor();

    expect(
      screen.getByRole("button", { name: "Sisipkan gambar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sematkan Imgur" }),
    ).toBeInTheDocument();
    // Fitur lama tetap ada.
    expect(screen.getByRole("button", { name: "Tebal" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sisipkan atau ubah tautan" }),
    ).toBeInTheDocument();
  });
});

describe("RichTextEditor: gambar langsung", () => {
  it("menyisipkan gambar dari dialog dengan atribut aman", async () => {
    const user = userEvent.setup();
    const { container } = renderEditor(null);

    await user.click(screen.getByRole("button", { name: "Sisipkan gambar" }));
    await user.type(
      screen.getByLabelText("URL gambar"),
      "https://i.imgur.com/L0pP68gl.jpg",
    );
    await user.type(screen.getByLabelText("Teks alternatif gambar"), "Contoh");
    await user.click(screen.getByRole("button", { name: /^Sisipkan$/ }));

    const img = container.querySelector("#artikel-editor img");
    expect(img).toHaveAttribute("src", "https://i.imgur.com/L0pP68gl.jpg");
    expect(img).toHaveAttribute("alt", "Contoh");
    // Wajib: Imgur menolak hotlink bila Referer dikirim (HTTP 403).
    expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
  });

  it("menolak URL gambar tidak aman tanpa menyisipkan apa pun", async () => {
    const user = userEvent.setup();
    const { container } = renderEditor(null);

    await user.click(screen.getByRole("button", { name: "Sisipkan gambar" }));
    await user.type(screen.getByLabelText("URL gambar"), "javascript:alert(1)");
    await user.click(screen.getByRole("button", { name: /^Sisipkan$/ }));

    expect(screen.getByRole("alert")).toHaveTextContent(/URL HTTPS/i);
    expect(container.querySelector("#artikel-editor img")).toBeNull();
  });

  it("menolak URL halaman album pada dialog gambar", async () => {
    const user = userEvent.setup();
    const { container } = renderEditor(null);

    await user.click(screen.getByRole("button", { name: "Sisipkan gambar" }));
    await user.type(
      screen.getByLabelText("URL gambar"),
      "https://imgur.com/a/l4mKcOj",
    );
    await user.click(screen.getByRole("button", { name: /^Sisipkan$/ }));

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(container.querySelector("#artikel-editor img")).toBeNull();
  });
});


describe("RichTextEditor: embed Imgur", () => {
  it("menyisipkan embed album dari URL album", async () => {
    const user = userEvent.setup();
    const { container } = renderEditor(null);

    await user.click(screen.getByRole("button", { name: "Sematkan Imgur" }));
    await user.type(
      screen.getByLabelText("URL atau kode embed Imgur"),
      "https://imgur.com/a/l4mKcOj",
    );
    await user.click(screen.getByRole("button", { name: /^Sematkan$/ }));

    const iframe = container.querySelector("#artikel-editor iframe");
    expect(iframe).toHaveAttribute(
      "src",
      "https://imgur.com/a/l4mKcOj/embed?pub=true",
    );
    expect(container.querySelector(".saring-embed")).not.toBeNull();
  });

  it("mengurai kode embed resmi tanpa menyimpan script", async () => {
    const user = userEvent.setup();
    const { container } = renderEditor(null);

    await user.click(screen.getByRole("button", { name: "Sematkan Imgur" }));
    await user.click(screen.getByLabelText("URL atau kode embed Imgur"));
    await user.paste(
      '<blockquote class="imgur-embed-pub" data-id="a/ALc9tWx"></blockquote><script async src="//s.imgur.com/min/embed.js"></script>',
    );
    await user.click(screen.getByRole("button", { name: /^Sematkan$/ }));

    const iframe = container.querySelector("#artikel-editor iframe");
    expect(iframe).toHaveAttribute(
      "src",
      "https://imgur.com/a/ALc9tWx/embed?pub=true",
    );
    // Tidak ada script Imgur yang dieksekusi dari input pengguna.
    expect(container.querySelector('script[src*="imgur"]')).toBeNull();
    expect(container.innerHTML).not.toContain("embed.js");
  });

  it("menolak URL yang bukan Imgur", async () => {
    const user = userEvent.setup();
    const { container } = renderEditor(null);

    await user.click(screen.getByRole("button", { name: "Sematkan Imgur" }));
    await user.type(
      screen.getByLabelText("URL atau kode embed Imgur"),
      "https://evil.test/a/l4mKcOj",
    );
    await user.click(screen.getByRole("button", { name: /^Sematkan$/ }));

    expect(screen.getByRole("alert")).toHaveTextContent(/URL album Imgur/i);
    expect(container.querySelector("#artikel-editor iframe")).toBeNull();
  });

  it("memuat embed yang sudah tersimpan di dokumen", () => {
    const { container } = renderEditor({
      type: "doc",
      content: [
        { type: "imgurEmbed", attrs: { id: "l4mKcOj", kind: "album" } },
      ],
    });

    expect(container.querySelector("#artikel-editor iframe")).toHaveAttribute(
      "src",
      "https://imgur.com/a/l4mKcOj/embed?pub=true",
    );
  });

  it("memuat gambar yang sudah tersimpan di dokumen", () => {
    const { container } = renderEditor({
      type: "doc",
      content: [
        {
          type: "image",
          attrs: { src: "https://i.imgur.com/L0pP68gl.jpg", alt: "Tersimpan" },
        },
      ],
    });

    const img = container.querySelector("#artikel-editor img");
    expect(img).toHaveAttribute("src", "https://i.imgur.com/L0pP68gl.jpg");
    expect(img).toHaveAttribute("alt", "Tersimpan");
  });
});

