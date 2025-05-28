# Phân tích create-next-app

Bản phân tích này đi sâu vào cấu trúc và hoạt động của gói `create-next-app` được cung cấp trong thư mục `create-next-app`.

## Tổng quan

`create-next-app` là một công cụ CLI để khởi tạo nhanh các dự án Next.js. Nó hỗ trợ cả chế độ tương tác (đặt câu hỏi cho người dùng) và không tương tác (thông qua các đối số dòng lệnh).

## Cấu trúc thư mục chính và tệp

*   **`index.ts`**: Điểm vào chính của CLI. Xử lý phân tích cú pháp đối số, nhắc nhở người dùng và gọi hàm `createApp`.
*   **`create-app.ts`**: Chứa logic cốt lõi để tạo ứng dụng, bao gồm:
    *   Xử lý việc sử dụng các ví dụ (examples) từ kho lưu trữ GitHub hoặc các mẫu cục bộ.
    *   Tạo cấu trúc thư mục.
    *   Sao chép các tệp mẫu.
    *   Cài đặt các gói phụ thuộc.
    *   Khởi tạo Git.
*   **`package.json`**: Định nghĩa các phụ thuộc, tập lệnh (scripts) và thông tin meta của gói.
    *   Sử dụng `ncc` để biên dịch mã TypeScript thành một tệp JavaScript duy nhất trong thư mục `dist/` để phân phối.
    *   Chỉ định `"bin": { "create-next-app": "./dist/index.js" }` để `npx` có thể thực thi nó.
*   **`helpers/`**: Chứa các hàm tiện ích được sử dụng trong toàn bộ dự án. Dưới đây là mô tả chi tiết hơn về một số helper chính:
    *   **`get-pkg-manager.ts`**: Phát hiện trình quản lý gói (npm, pnpm, yarn, bun) mà người dùng đang sử dụng dựa trên biến môi trường `npm_config_user_agent`.
    *   **`is-folder-empty.ts`**: Kiểm tra xem một thư mục có trống không, bỏ qua một danh sách các tệp và thư mục hợp lệ thường thấy (ví dụ: `.git`, `.DS_Store`). Nếu có xung đột, nó sẽ liệt kê các tệp đó.
    *   **`is-online.ts`**: Kiểm tra xem người dùng có kết nối internet hay không bằng cách thực hiện DNS lookup đến `registry.yarnpkg.com`. Nếu có proxy được cấu hình (qua `process.env.https_proxy` hoặc `npm config get https-proxy`), nó sẽ kiểm tra kết nối đến proxy đó.
    *   **`is-writeable.ts`**: Kiểm tra xem một thư mục có quyền ghi hay không bằng cách sử dụng `fs.access` với cờ `W_OK`.
    *   **`validate-pkg.ts`**: Sử dụng thư viện `validate-npm-package-name` để xác thực xem tên dự án có phải là một tên gói npm hợp lệ hay không.
    *   **`examples.ts`**: Cung cấp logic để xử lý việc tải xuống và giải nén các ví dụ (examples) từ GitHub.
        *   `getRepoInfo`: Phân tích cú pháp URL GitHub để trích xuất thông tin người dùng, tên kho lưu trữ, nhánh và đường dẫn tệp.
        *   `hasRepo`: Kiểm tra xem một `package.json` có tồn tại trong đường dẫn ví dụ của kho lưu trữ GitHub hay không bằng cách truy vấn API GitHub.
        *   `existsInRepo`: Kiểm tra xem một ví dụ có tên cụ thể có tồn tại trong kho lưu trữ `vercel/next.js/examples` hay không, hoặc nếu một URL được cung cấp có hợp lệ không.
        *   `downloadAndExtractRepo`: Tải xuống một tệp tarball từ GitHub (sử dụng `codeload.github.com`) và giải nén nó vào thư mục gốc, chỉ giữ lại các tệp trong `filePath` được chỉ định.
        *   `downloadAndExtractExample`: Tải xuống tarball của nhánh `canary` của `vercel/next.js` và giải nén một ví dụ cụ thể từ thư mục `examples/`.
        *   Cả hai hàm tải xuống đều sử dụng `node:stream/promises` (pipeline) và thư viện `tar` để xử lý luồng và giải nén.
    *   **`git.ts`**: Cung cấp hàm `tryGitInit` để khởi tạo một kho lưu trữ Git mới trong thư mục dự án.
        *   Kiểm tra xem Git có được cài đặt không.
        *   Kiểm tra xem có đang ở trong một kho Git hoặc Mercurial hiện có hay không.
        *   Chạy `git init`.
        *   Đặt nhánh mặc định thành `main` nếu chưa được cấu hình.
        *   Thêm tất cả các tệp và tạo một commit ban đầu.
        *   Nếu có lỗi, nó sẽ cố gắng xóa thư mục `.git` đã tạo.
    *   **`install.ts`**: Cung cấp hàm `install` để chạy lệnh cài đặt của trình quản lý gói đã chọn (npm, pnpm, yarn, bun).
        *   Sử dụng `cross-spawn` để thực thi lệnh.
        *   Hỗ trợ chế độ offline bằng cách thêm cờ `--offline`.
        *   Thiết lập một số biến môi trường như `NODE_ENV=development` để đảm bảo các `devDependencies` được cài đặt.
    *   **`copy.ts`**: Cung cấp hàm `copy` để sao chép tệp và thư mục.
        *   Sử dụng `fast-glob` để tìm các tệp nguồn dựa trên các mẫu glob.
        *   Cho phép đổi tên tệp và duy trì cấu trúc thư mục cha.
        *   Sử dụng `fs.promises.copyFile` và `fs.promises.mkdir`.
*   **`templates/`**: Chứa các tệp mẫu khác nhau cho các cấu hình dự án khác nhau (ví dụ: JavaScript/TypeScript, có/không có Tailwind CSS, App Router/Pages Router).
*   **`README.md`**: Tài liệu hướng dẫn sử dụng và các tùy chọn CLI.
*   **`tsconfig.json`**: Cấu hình trình biên dịch TypeScript.

## Luồng hoạt động chính (từ `index.ts` và `create-app.ts`)

1.  **Khởi tạo và Phân tích cú pháp Đối số** (`index.ts`):
    *   Sử dụng thư viện `commander` để định nghĩa các tùy chọn CLI và phân tích cú pháp các đối số do người dùng cung cấp.
    *   Xác định đường dẫn dự án (tên thư mục).
    *   Xác định trình quản lý gói sẽ sử dụng (`getPkgManager`).
2.  **Lưu trữ và Đặt lại Tùy chọn** (`index.ts`):
    *   Sử dụng thư viện `conf` để lưu trữ các tùy chọn người dùng đã chọn trước đó (ví dụ: lựa chọn TypeScript, Tailwind CSS) để sử dụng lại trong các lần chạy sau.
    *   Cung cấp tùy chọn `--reset-preferences` để xóa các tùy chọn đã lưu.
3.  **Nhắc nhở Người dùng (Prompting)** (`index.ts`):
    *   Nếu các tùy chọn cần thiết không được cung cấp qua đối số dòng lệnh (và không có `--yes` hoặc không chạy trong CI), sử dụng thư viện `prompts` để hỏi người dùng về các lựa chọn của họ (ví dụ: tên dự án, TypeScript, Tailwind, ESLint, App Router, thư mục `src`, v.v.).
    *   Xác thực đầu vào của người dùng (ví dụ: tên dự án hợp lệ với `validateNpmName`).
4.  **Chuẩn bị Tạo Ứng dụng** (`index.ts` -> `createApp` trong `create-app.ts`):
    *   Giải quyết đường dẫn ứng dụng đầy đủ.
    *   Kiểm tra xem thư mục đích có thể ghi được không.
    *   Kiểm tra xem thư mục có trống không (`isFolderEmpty`).
5.  **Xử lý Ví dụ (Examples) hoặc Mẫu (Templates)** (`create-app.ts`):
    *   **Nếu một ví dụ được cung cấp (`--example`):**
        *   Xác định thông tin kho lưu trữ GitHub (`getRepoInfo`, `hasRepo`, `existsInRepo`).
        *   Tải xuống và giải nén ví dụ (`downloadAndExtractExample` hoặc `downloadAndExtractRepo`). Sử dụng `async-retry` để thử lại nếu tải xuống thất bại.
        *   Sao chép các tệp cần thiết như `.gitignore` hoặc `next-env.d.ts` nếu chúng không có trong ví dụ.
    *   **Nếu không có ví dụ nào được cung cấp (sử dụng mẫu cục bộ):**
        *   Gọi hàm `installTemplate`.
6.  **Cài đặt Mẫu (Templates)** (`installTemplate` trong `templates/index.ts` được gọi từ `create-app.ts`):
    *   Xác định loại mẫu và chế độ (TypeScript/JavaScript) dựa trên lựa chọn của người dùng.
    *   Sao chép các tệp từ thư mục `templates/` tương ứng vào thư mục dự án.
    *   Tùy chỉnh các tệp mẫu: ví dụ, cập nhật `package.json` của dự án mới (thêm tên, các tập lệnh, phần phụ thuộc như Tailwind, ESLint).
    *   Cấu hình `jsconfig.json` hoặc `tsconfig.json` cho alias nhập khẩu.
7.  **Cài đặt Gói phụ thuộc** (`create-app.ts`):
    *   Trừ khi có tùy chọn `--skip-install`, chạy lệnh cài đặt bằng trình quản lý gói đã chọn (`install` helper sử dụng `cross-spawn`).
8.  **Khởi tạo Git** (`create-app.ts`):
    *   Trừ khi có tùy chọn `--disable-git`, thử khởi tạo một kho lưu trữ Git mới (`tryGitInit`).
9.  **Thông báo Hoàn tất** (`index.ts`):
    *   Hiển thị các hướng dẫn tiếp theo cho người dùng.
10. **Kiểm tra Cập nhật** (`index.ts`):
    *   Sử dụng `update-check` để thông báo cho người dùng nếu có phiên bản mới của `create-next-app`.

## Các thư viện chính và Công nghệ được sử dụng

*   **`commander`**: Phân tích cú pháp đối số dòng lệnh.
*   **`prompts`**: Tạo các câu hỏi tương tác cho người dùng.
*   **`conf`**: Lưu trữ các tùy chọn/cấu hình của người dùng.
*   **`picocolors`**: Tô màu cho output trên terminal.
*   **`@vercel/ncc`**: Biên dịch mã nguồn TypeScript (bao gồm cả các phụ thuộc) thành một tệp JavaScript duy nhất, tối ưu hóa cho việc phân phối CLI.
*   **`cross-spawn`**: Chạy các lệnh con một cách đáng tin cậy trên các nền tảng khác nhau (ví dụ: để chạy `npm install`).
*   **`async-retry`**: Thử lại các hàm bất đồng bộ (được sử dụng khi tải xuống ví dụ).
*   **`ci-info`**: Phát hiện môi trường CI (Continuous Integration).
*   **`validate-npm-package-name`**: Kiểm tra tính hợp lệ của tên gói npm.
*   **`tar`**: Để giải nén các tệp ví dụ (thường là tệp `.tar.gz`).
*   **`fast-glob`**: Để tìm kiếm tệp dựa trên các mẫu glob (có thể được sử dụng nội bộ hoặc trong các tập lệnh).
*   **Node.js built-in modules**: `fs`, `path`, `child_process` (gián tiếp qua `cross-spawn`).

## Quản lý Mẫu (Templates)

*   Các mẫu được lưu trữ trong thư mục `templates/`.
*   Mỗi thư mục con trong `templates/` đại diện cho một cấu hình cụ thể (ví dụ: `default-js`, `app-ts-tw`).
*   Hàm `installTemplate` (trong `templates/index.ts`) chịu trách nhiệm:
    *   Chọn đúng thư mục mẫu.
    *   Sao chép các tệp chung (ví dụ: `.gitignore`, `README.md` cơ bản).
    *   Sao chép các tệp cụ thể cho ngôn ngữ (JS/TS).
    *   Sao chép và cấu hình các tệp cho các tính năng tùy chọn (Tailwind, ESLint).
    *   Cập nhật `package.json` của dự án mới với các phần phụ thuộc và tập lệnh phù hợp.

## Điểm đáng chú ý khác

*   **Hỗ trợ Offline**: Cố gắng sử dụng cache cục bộ nếu không có kết nối mạng.
*   **Thông báo Lỗi và Hướng dẫn**: Cung cấp thông báo rõ ràng cho người dùng.
*   **Tùy chỉnh Import Alias**: Cho phép người dùng chỉ định một alias nhập khẩu tùy chỉnh.
*   **Tùy chọn `--empty`**: Tạo một dự án Next.js tối thiểu.
*   **Tùy chọn `--api`**: Khởi tạo một API headless sử dụng App Router.
*   **Tích hợp Turbopack/Rspack**: Có các tùy chọn để sử dụng Turbopack hoặc Rspack.

Đây là những điểm chính tôi ghi nhận được từ việc xem xét mã nguồn `create-next-app` bạn cung cấp. Tệp này sẽ là một tài liệu tham khảo tốt khi chúng ta xây dựng `create-cursor-workspace`. 