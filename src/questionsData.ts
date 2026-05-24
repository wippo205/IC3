import { Question } from './types';

// Broad base of authentic, educational IC3 questions in Vietnamese
export const baseQuestions: Question[] = [
  {
    id: 'hw_1',
    text: 'Thiết bị nào sau đây được coi là "bộ não" của máy tính?',
    options: ['RAM (Bộ nhớ trong)', 'CPU (Bộ vi xử lý)', 'HDD (Ổ đĩa cứng)', 'MAINBOARD (Bo mạch chủ)'],
    correctIndex: 1,
    explanation: 'CPU (Central Processing Unit) là bộ vi xử lý điều khiển mọi hoạt động của máy tính, đóng vai trò như bộ não.',
    category: 'hardware'
  },
  {
    id: 'hw_2',
    text: 'Thiết bị nào sau đây là thiết bị VÀO (Input Device)?',
    options: ['Màn hình', 'Máy in', 'Bàn phím', 'Loa'],
    correctIndex: 2,
    explanation: 'Bàn phím truyền ký tự và lệnh từ người dùng vào máy tính, do đó nó là thiết bị vào. Màn hình, máy in, loa là thiết bị ra.',
    category: 'hardware'
  },
  {
    id: 'hw_3',
    text: 'Thiết bị nào sau đây là thiết bị RA (Output Device)?',
    options: ['Chuột', 'Máy in', 'Máy quét (Scanner)', 'Bút cảm ứng'],
    correctIndex: 1,
    explanation: 'Máy in đưa kết quả dữ liệu từ máy tính ra giấy, thuộc nhóm thiết bị ra.',
    category: 'hardware'
  },
  {
    id: 'hw_4',
    text: 'Bộ nhớ RAM khác bộ nhớ ROM ở điểm nào?',
    options: [
      'RAM mất dữ liệu khi mất điện, ROM không mất dữ liệu',
      'ROM mất dữ liệu khi mất điện, RAM giữ lại dữ liệu',
      'RAM chỉ đọc dữ liệu, ROM chỉ ghi dữ liệu',
      'RAM và ROM giống hệt nhau về mọi mặt'
    ],
    correctIndex: 0,
    explanation: 'RAM là bộ nhớ truy cập ngẫu nhiên tạm thời, mất dữ liệu khi tắt nguồn điện. ROM là bộ nhớ chỉ đọc, giữ nguyên dữ liệu kể cả khi mất điện.',
    category: 'hardware'
  },
  {
    id: 'hw_5',
    text: 'Khi chọn mua ổ cứng lưu trữ, đơn vị đo dung lượng thông dụng nhất hiện nay là gì?',
    options: ['Hertz (Hz)', 'Gigabyte (GB) hoặc Terabyte (TB)', 'Pixels (px)', 'Megabits per second (Mbps)'],
    correctIndex: 1,
    explanation: 'Dung lượng lưu trữ của ổ cứng được đo bằng các đơn vị bội số của byte như GB và TB.',
    category: 'hardware'
  },
  {
    id: 'hw_6',
    text: 'Cổng kết nối nào thường được dùng để cắm chuột, bàn phím và ổ đĩa di động USB ngày nay?',
    options: ['Cổng VGA', 'Cổng HDMI', 'Cổng USB', 'Cổng Ethernet'],
    correctIndex: 2,
    explanation: 'Cổng USB (Universal Serial Bus) là cổng tiêu chuẩn phổ biến nhất cho chuột, bàn phím và thiết bị lưu trữ di động.',
    category: 'hardware'
  },
  {
    id: 'hw_7',
    text: 'Điện thoại thông minh (Smartphone) sử dụng thiết bị nào vừa là thiết bị vào vừa là thiết bị ra?',
    options: ['Nút nguồn', 'Màn hình cảm ứng', 'Camera sau', 'Khe cắm thẻ nhớ'],
    correctIndex: 1,
    explanation: 'Màn hình cảm ứng nhận lực chạm của ngón tay (vào) và cùng lúc hiển thị hình ảnh phản hồi cho người dùng (ra).',
    category: 'hardware'
  },
  {
    id: 'sw_1',
    text: 'Windows, macOS, Linux, Android và iOS được xếp vào loại phần mềm nào?',
    options: ['Phần mềm ứng dụng', 'Hệ điều hành (Phần mềm hệ thống)', 'Phần mềm diệt virus', 'Trình duyệt web'],
    correctIndex: 1,
    explanation: 'Đây đều là những Hệ điều hành đóng vai trò vận hành, quản lý phần cứng và làm nền tảng chạy các phần mềm khác.',
    category: 'software'
  },
  {
    id: 'sw_2',
    text: 'Để viết một bài văn trên máy tính, em nên dùng phần mềm nào?',
    options: ['Microsoft Word', 'Microsoft Excel', 'Microsoft PowerPoint', 'Google Chrome'],
    correctIndex: 0,
    explanation: 'Microsoft Word là phần mềm soạn thảo văn bản chuyên nghiệp, thích hợp nhất cho việc viết văn, báo cáo.',
    category: 'software'
  },
  {
    id: 'sw_3',
    text: 'Đâu không phải là phần mềm trình chiếu?',
    options: ['Microsoft PowerPoint', 'Google Slides', 'Apple Keynote', 'Microsoft Access'],
    correctIndex: 3,
    explanation: 'Microsoft Access là phần mềm quản trị cơ sở dữ liệu. PowerPoint, Slides, Keynote đều là phần mềm dùng để trình chiếu.',
    category: 'software'
  },
  {
    id: 'sw_4',
    text: 'Phím tắt nào giúp em sao chép (Copy) văn bản hoặc tệp tin một cách nhanh chóng?',
    options: ['Ctrl + X', 'Ctrl + V', 'Ctrl + C', 'Ctrl + Z'],
    correctIndex: 2,
    explanation: 'Ctrl + C dùng để sao chép (Copy); Ctrl + X để cắt; Ctrl + V để dán; Ctrl + Z để hoàn tác.',
    category: 'software'
  },
  {
    id: 'sw_5',
    text: 'Hành động nào sau đây là đóng chương trình đang chạy trong hệ điều hành Windows?',
    options: ['Nhấp biểu tượng dấu trừ (–) ở góc trên bên phải', 'Nhấp biểu tượng chữ X đỏ ở góc trên bên phải', 'Nhấp đúp chuột vào màn hình nền', 'Nhấn phím F5'],
    correctIndex: 1,
    explanation: 'Nhấp biểu tượng chữ X ở góc trên bên phải cửa sổ sẽ thực hiện tắt/đóng hoàn toàn chương trình đang chạy.',
    category: 'software'
  },
  {
    id: 'net_1',
    text: 'Mạng WAN là từ viết tắt của loại mạng máy tính nào?',
    options: ['Mạng cục bộ không dây', 'Mạng diện rộng (quốc gia, toàn cầu)', 'Mạng trong một tòa nhà', 'Mạng cá nhân tầm ngắn'],
    correctIndex: 1,
    explanation: 'WAN (Wide Area Network) là mạng diện rộng, kết nối các máy tính ở khoảng cách rất lớn như giữa các thành phố, quốc gia.',
    category: 'network'
  },
  {
    id: 'net_2',
    text: 'Thiết bị khách (Client) muốn gửi yêu cầu lấy trang web thì phải kết nối đến thiết bị nào để nhận phản hồi dữ liệu?',
    options: ['Máy chủ (Server)', 'Cáp mạng mạng quang', 'Bộ định tuyến (Router)', 'USB Hub'],
    correctIndex: 0,
    explanation: 'Máy chủ (Server) là thiết bị cung cấp dịch vụ, lưu trữ trang web và phản hồi các yêu cầu từ máy khách (Client).',
    category: 'network'
  },
  {
    id: 'net_3',
    text: 'Đâu là một ví dụ về nhà cung cấp dịch vụ Internet (ISP - Internet Service Provider)?',
    options: ['Google', 'Viettel / FPT / VNPT', 'Microsoft', 'Intel'],
    correctIndex: 1,
    explanation: 'ISP là các công ty viễn thông cung cấp đường truyền và dịch vụ truy cập Internet cho gia đình và trường học, ví dụ Viettel, VNPT, FPT.',
    category: 'network'
  },
  {
    id: 'net_4',
    text: 'Trình duyệt web phổ biến hiện nay dùng để xem các trang web là:',
    options: ['Google Docs', 'Google Chrome / Microsoft Edge', 'Windows Explorer', 'Adobe Photoshop'],
    correctIndex: 1,
    explanation: 'Google Chrome, Microsoft Edge, Mozilla Firefox và Safari là các trình duyệt web (Web Browsers) dùng để mở và đọc trang web.',
    category: 'network'
  },
  {
    id: 'net_5',
    text: 'Mục "BCC" trong cửa sổ soạn thảo thư điện tử (Email) có tác dụng gì?',
    options: [
      'Đính kèm tệp tin có dung lượng lớn',
      'Gửi bản sao thư điện tử đến người nhận khác, nhưng ẩn danh sách người nhận này',
      'Gửi thư điện tử khẩn cấp có chuông báo',
      'Tự động trả lời thư khi đi vắng'
    ],
    correctIndex: 1,
    explanation: 'BCC (Blind Carbon Copy) cho phép em gửi thư cho nhiều người nhưng những người khác sẽ không nhìn thấy danh sách email này.',
    category: 'network'
  },
  {
    id: 'safe_1',
    text: 'Mật khẩu nào sau đây được coi là mật khẩu mạnh và an toàn nhất?',
    options: ['12345678', 'wippo123', 'W!pp0_Ic3_2026', 'hoahongvang'],
    correctIndex: 2,
    explanation: 'Mật khẩu mạnh luôn phải bao gồm chữ hoa, chữ thường, chữ số, độ dài lớn (từ 8 ký tự trở lên) và có ký tự đặc biệt như (!, _, @).',
    category: 'safety'
  },
  {
    id: 'safe_2',
    text: 'Nếu em nhận được một email từ người lạ chứa một liên kết (link) lạ hứa hẹn tặng quà miễn phí, em nên làm gì?',
    options: [
      'Nhấp ngay vào liên kết để nhận quà trước khi hết hạn',
      'Không nhấp vào, báo cáo tin rác và xóa email đi để bảo vệ máy tính',
      'Gửi liên kết đó cho tất cả bạn bè trong lớp cùng nhận quà',
      'Trả lời email yêu cầu họ gửi mật khẩu tài khoản của em'
    ],
    correctIndex: 1,
    explanation: 'Đây là hình thức lừa đảo giả mạo (phishing) nguy hiểm. Nhấp vào link có thể làm nhiễm phần mềm độc hại hoặc bị đánh cắp tài khoản.',
    category: 'safety'
  },
  {
    id: 'safe_3',
    text: 'Quy tắc ứng xử lịch sự, văn minh và tôn trọng lẫn nhau khi tham gia thế giới mạng được gọi là gì?',
    options: ['Quy luật vũ trụ', 'Đạo đức kinh doanh', 'Netiquette (Quy tắc ứng xử trên mạng)', 'Hiến pháp số'],
    correctIndex: 2,
    explanation: '"Netiquette" (Internet + Etiquette) là các phép lịch sự, chuẩn mực đạo đức mà mọi người cần tuân thủ khi viết bình luận, gửi tin nhắn trực tuyến.',
    category: 'safety'
  },
  {
    id: 'safe_4',
    text: 'Khi tải xuống một tệp nhạc hoặc ảnh từ trang web không chính thống và sử dụng nó vào bài thuyết trình của mình mà không dẫn nguồn, hành động này vi phạm điều gì?',
    options: ['Bản quyền tác giả (Copyright)', 'An toàn dữ liệu cá nhân', 'Độ tin cậy của phần cứng', 'Chính sách bảo hành'],
    correctIndex: 0,
    explanation: 'Sử dụng tác phẩm sáng tạo của người khác không xin phép hay dẫn nguồn là vi phạm Bản quyền tác giả (Copyright infringement).',
    category: 'safety'
  },
  {
    id: 'safe_5',
    text: 'Khi em cảm thấy bị ai đó đe dọa, tẩy chay hoặc quấy rầy liên tục trên mạng xã hội, em đang là nạn nhân của hoạt động nào?',
    options: ['Tải phần mềm trái phép', 'Bắt nạt trực tuyến (Cyberbullying)', 'Quảng cáo nhắm mục tiêu', 'Rò rỉ IP'],
    correctIndex: 1,
    explanation: 'Bắt nạt trực tuyến (Cyberbullying) là hành vi sử dụng công nghệ số để dọa dẫm, quấy phá hoặc xúc phạm người khác.',
    category: 'safety'
  },
  {
    id: 'skills_1',
    text: 'Trên bảng tính Excel, công thức nào chính xác nhất để tính TỔNG các ô từ A1 đến A5?',
    options: ['=SUM(A1:A5)', '=TOTAL(A1+A5)', '=AVERAGE(A1,A5)', '=A1+A5'],
    correctIndex: 0,
    explanation: 'Trong Excel, hàm =SUM(A1:A5) là cú pháp chuẩn để cộng giá trị của mọi ô từ A1 đến A5.',
    category: 'skills'
  },
  {
    id: 'skills_2',
    text: 'Khi dùng Google để tìm chính xác một cụm từ, em nên đặt cụm từ đó trong ký tự nào?',
    options: ['Dấu ngoặc đơn ( )', 'Dấu ngoặc kép " "', 'Dấu ngoặc nhọn { }', 'Dấu ngoặc vuông [ ]'],
    correctIndex: 1,
    explanation: 'Sử dụng dấu ngoặc kép "cụm từ cần tìm" sẽ yêu cầu Google trả về các trang chứa chính xác cụm từ đó theo đúng thứ tự.',
    category: 'skills'
  },
  {
    id: 'skills_3',
    text: 'Hành động nào sau đây giúp sao lưu (Backup) dữ liệu cá nhân một cách tốt nhất khỏi nguy cơ hỏng máy tính học tập?',
    options: [
      'Chép dữ liệu từ ổ C sang ổ D trên cùng một máy',
      'Đổi đuôi tệp thành định dạng nén zip',
      'Sao lưu dữ liệu lên đám mây (Google Drive, OneDrive) hoặc sao lưu ra ổ cứng ngoài',
      'Tắt nguồn máy tính khi không sử dụng'
    ],
    correctIndex: 2,
    explanation: 'Lưu trữ sang một thiết bị vật lý khác hoặc đưa lên dịch vụ đám mây giúp bảo toàn dữ liệu khi phần cứng máy tính bất ngờ hỏng hóc.',
    category: 'skills'
  },
  {
    id: 'skills_4',
    text: 'Nút "Cc" trong soạn thảo thư điện tử viết tắt của từ gì và dùng để làm gì?',
    options: [
      'Carbon Copy - Dùng để gửi đồng thời một bản sao thư cho người nhận phụ khác',
      'Computer Cable - Kết nối dây mạng cáp quang',
      'Cyber Cover - Đổi hình ảnh đại diện của hòm thư',
      'Cancel Communication - Hủy chế độ gửi thư'
    ],
    correctIndex: 0,
    explanation: 'CC viết tắt của Carbon Copy, dùng để gửi đồng thời một bản sao của email cho người khác. Mọi người nhận đều nhìn thấy địa chỉ của nhau.',
    category: 'skills'
  },
  {
    id: 'skills_5',
    text: 'Để sắp xếp các trang trình bày trong PowerPoint một cách trực quan bằng ảnh thu nhỏ từ các trang, chế độ xem nào là thích hợp nhất?',
    options: ['Outline View', 'Slide Sorter View', 'Reading View', 'Normal View'],
    correctIndex: 1,
    explanation: 'Chế độ Slide Sorter giúp học sinh xem tất cả các ô trình chiếu (slide) dưới dạng ảnh thu nhỏ để dễ dàng kéo thả và thay đổi thứ tự.',
    category: 'skills'
  }
];

// Helper functions to generate stable pseudo-random numbers based on string seeds
function seedRandom(seedStr: string) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return () => {
    const x = Math.sin(hash++) * 10000;
    return x - Math.floor(x);
  };
}

// Dynamically generate exact amount of questions per lesson for a specific grade
export function generateQuestionsForLesson(grade: number, lessonId: number, targetCount: number): Question[] {
  const seed = `${grade}-${lessonId}`;
  const rand = seedRandom(seed);

  // Group our base questions by category to ensure balanced selection
  const categories = ['hardware', 'software', 'network', 'safety', 'skills'] as const;
  const categorized: Record<string, Question[]> = {
    hardware: baseQuestions.filter(q => q.category === 'hardware'),
    software: baseQuestions.filter(q => q.category === 'software'),
    network: baseQuestions.filter(q => q.category === 'network'),
    safety: baseQuestions.filter(q => q.category === 'safety'),
    skills: baseQuestions.filter(q => q.category === 'skills'),
  };

  const results: Question[] = [];
  let availableBase = [...baseQuestions];

  // Pick existing base questions and generate custom dynamic duplicates with slight structural variations
  const techAdjectives = ['hiện đại', 'thế hệ mới', 'tối ưu', 'cao cấp', 'tiêu chuẩn'];
  const userNames = ['An', 'Bình', 'Chi', 'Dũng', 'Minh', 'Hoa', 'Wippo'];
  const brandNames = ['ASUS', 'HP', 'Dell', 'Lenovo', 'Apple', 'Acer'];

  for (let i = 0; i < targetCount; i++) {
    // Select based on category rotation or flat access
    const category = categories[i % categories.length];
    const catList = categorized[category];
    
    // Choose base question template
    const baseIndex = Math.floor(rand() * catList.length);
    const baseQ = catList[baseIndex];

    // Build custom variation based on counter
    const adj = techAdjectives[Math.floor(rand() * techAdjectives.length)];
    const uName = userNames[Math.floor(rand() * userNames.length)];
    const brand = brandNames[Math.floor(rand() * brandNames.length)];

    let text = baseQ.text;
    let options = [...baseQ.options];
    let explanation = baseQ.explanation;

    // Mutate the text slightly to make it feel fresh for different question indices
    if (i >= baseQuestions.length) {
      if (baseQ.id.startsWith('hw_1')) {
        text = `Khi chọn cấu hình cho máy tính học tập hiệu quả, thành phần ${adj} đóng vai trò điều khiển trung tâm (bộ não) của máy là gì?`;
      } else if (baseQ.id.startsWith('hw_2')) {
        text = `Bạn ${uName} muốn nhập dữ liệu viết tay vào máy tính thành dạng số hóa. Bạn ${uName} nên dùng thiết bị VÀO nào?`;
        options = ['Màn hình thường', 'Loa âm thanh', 'Máy quét (Scanner) hoặc chuột', 'Máy in laser'];
        explanation = `Máy quét (Scanner) giúp nhập văn bản viết tay vào máy tính dưới dạng ảnh kỹ thuật số (thiết bị vào).`;
      } else if (baseQ.id.startsWith('hw_3')) {
        text = `Để nghe nhạc hoặc âm thanh học tập phát ra từ máy tính ${brand}, em sử dụng thiết bị RA nào?`;
        options = ['Microphone', 'Máy chiếu / Loa âm thanh', 'Chuột máy tính', 'Bàn phím không dây'];
        explanation = `Loa và màn hình máy chiếu là thiết bị nhận tín hiệu điện từ máy tính và chuyển đổi thành âm thanh/hình ảnh (loại ra).`;
      } else if (baseQ.id.startsWith('sw_1')) {
        text = `Nếu mua điện thoại hoặc máy tính bảng ${brand}, hệ điều hành đóng vai trò là phần mềm hệ thống vận hành thiết bị này có tên là gì?`;
      } else if (baseQ.id.startsWith('sw_2')) {
        text = `Để tổng hợp điểm học tập của các bạn và vẽ biểu đồ theo dõi tự động học tập, công cụ thích hợp nhất là gì?`;
        options = ['Microsoft Excel', 'Microsoft PowerPoint', 'Microsoft Word', 'Windows Notepad'];
        explanation = 'Microsoft Excel là phần mềm bảng tính, sinh ra đặc biệt để giải quyết các ô cột dữ liệu số và làm biểu đồ.';
      } else if (baseQ.id.startsWith('safe_1')) {
        text = `Bạn ${uName} muốn thiết lập một mật khẩu vừa mạnh vừa an toàn tuyệt đối cho tài khoản Wippo IC3 của mình. Chọn mật khẩu thích hợp:`;
        options = [`${uName.toLowerCase()}123456`, `${brand.toUpperCase()}_Super_${i}026!`, 'ilovecomputers3', 'password123'];
        explanation = 'Mật khẩu độ dài xuất sắc với chữ thường, chữ hoa, ký số và ký tự đặc biệt vô cùng khó bị bẻ khóa.';
      } else {
        // Fallback modification
        text = `[Câu ôn tập bổ sung ${i + 1}] ` + baseQ.text;
      }
    } else if (i > 0) {
      // Small decoration
      text = `${text}`;
    }

    results.push({
      id: `${baseQ.id}_var_${i}`,
      text,
      options,
      correctIndex: baseQ.correctIndex,
      explanation,
      category: baseQ.category
    });
  }

  return results;
}
