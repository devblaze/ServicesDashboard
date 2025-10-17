# Changelog

All notable changes to Services Dashboard will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - IP Address Management System

#### Backend Infrastructure
- **Complete IP Management Backend** with comprehensive REST API
  - Created 5 database tables: `Subnets`, `NetworkDevices`, `DeviceHistory`, `IpReservations`, `OmadaControllers`
  - Implemented Entity Framework Core migrations for schema management
  - Added 35+ FastEndpoints API endpoints across 4 controller files
  - Built `IpManagementService` with business logic for IP operations
  - Implemented `OmadaControllerService` for TP-Link Omada integration

- **Subnet Management**
  - CRUD operations for network subnets (CIDR notation support)
  - DHCP range configuration and tracking
  - Gateway IP management
  - VLAN ID support
  - Subnet monitoring toggle
  - DNS server configuration
  - Subnet summary statistics (usage percentage, available IPs, device counts)

- **IP Address Management**
  - IP availability checking across subnets
  - Find next available IP with DHCP range avoidance
  - IP conflict detection
  - Support for static IP assignments
  - DHCP-assigned IP tracking
  - Gateway IP reservation

- **Network Device Management**
  - Device discovery and tracking
  - MAC address management
  - Hostname resolution
  - Device type classification (Computer, Server, Phone, Tablet, IoT, Network Device, Printer, Camera, Storage, Gaming, Smart Home)
  - Device status monitoring (Online, Offline, Unknown)
  - Discovery source tracking (Network Scan, Omada Controller, Manual Entry, SNMP, ARP Table)
  - Device history and event logging
  - Open ports tracking
  - Operating system detection
  - Response time monitoring

- **IP Reservation System**
  - Reserve IP addresses for specific purposes
  - MAC address binding for reservations
  - Reservation expiration dates
  - Active/inactive reservation states
  - Assignment tracking (who/what the reservation is for)

- **Omada Controller Integration**
  - TP-Link Omada Controller API integration
  - Automatic client synchronization
  - DHCP lease information retrieval
  - Scheduled sync configuration
  - Connection testing
  - Multi-controller support
  - Sync status and error tracking

#### Frontend Features

- **Main IP Management Dashboard**
  - Tabbed navigation interface
  - Five main sections: Subnets, IP Overview, Devices, Reservations, Omada Settings
  - Dark/light mode support throughout
  - Responsive design for all screen sizes

- **Subnet Manager**
  - Visual subnet cards with usage statistics
  - Color-coded usage bars (green < 75%, yellow < 90%, red >= 90%)
  - Quick stats: Online devices, Available IPs, Reserved IPs
  - CRUD operations with modal forms
  - Real-time subnet summary updates
  - One-click navigation to IP grid visualization
  - CIDR notation validation

- **IP Grid Visualization**
  - Visual color-coded IP address grid
    - 🟢 Green: Available IPs
    - 🔵 Blue: In Use (assigned to devices)
    - 🟣 Purple: Reserved IPs
    - 🟡 Yellow: DHCP Pool range
    - 🟠 Orange: Gateway addresses
  - Hover tooltips with device details
  - Click for full device information modal
  - Search and filter functionality
  - Statistics dashboard with IP counts
  - Filter by status (Used Only, Available Only)
  - Support for all subnet sizes

- **IP Overview Tab** (NEW)
  - Comprehensive list of all IP addresses across all subnets
  - Detailed statistics dashboard
  - Advanced filtering options:
    - Status filter (All, Taken, Available)
    - Subnet filter (view all or specific subnet)
    - Real-time search across IPs, hostnames, MAC addresses, and device types
  - Sortable table with columns:
    - Status with visual indicators
    - IP Address (monospace font)
    - Subnet information
    - Hostname
    - MAC Address
    - Device Type
  - Shows total IPs, usage percentage, and category counts
  - Refresh button for manual data updates

- **Device Tracker** (Coming Soon)
  - Placeholder component for device list and management
  - Will include device search, filtering, and categorization
  - Real-time status monitoring
  - Device history and change tracking

- **Reservation Manager** (Coming Soon)
  - Placeholder component for IP reservation CRUD
  - Will support creating, editing, and deleting reservations
  - Expiration date management
  - MAC address assignment

- **Omada Settings** (Coming Soon)
  - Placeholder component for Omada Controller configuration
  - Will include connection configuration (URL: 192.168.4.200)
  - Connection testing
  - Automatic client synchronization setup
  - Schedule configuration

#### Navigation Improvements

- **Reorganized Top Navigation Menu**
  - Reduced from 8 individual tabs to 4 main items
  - Implemented dropdown menus for better organization
  - New navigation structure:
    - 📊 **Services** (Direct Access)
    - 🏗️ **Infrastructure** (Dropdown)
      - Servers
      - Docker Services
      - Network Discovery
      - IP Management
    - ⚡ **Automation** (Dropdown)
      - Scheduled Tasks
      - Deployments
    - ⚙️ **Settings** (Positioned on right side)

- **Enhanced Navigation UX**
  - Dropdown menus with smooth animations
  - Active state indicators for dropdown groups
  - Click-outside-to-close functionality
  - Chevron rotation animation on dropdown open/close
  - Active sub-items highlighted within dropdowns
  - Settings moved to right side for better visual balance
  - Responsive hover states
  - Professional spacing and typography

#### Technical Improvements

- **API Client Architecture**
  - All IP Management APIs extend `BaseApiClient` for consistency
  - Standardized error handling across all endpoints
  - Type-safe API calls with TypeScript
  - React Query integration for caching and state management

- **Type System Enhancements**
  - Converted TypeScript enums to union types for `erasableSyntaxOnly` compatibility
  - Created comprehensive TypeScript interfaces matching backend models
  - Type-safe helper functions for device types and status colors
  - Proper typing for all API requests and responses

- **Component Architecture**
  - Consistent `darkMode` prop pattern across all components
  - Removed dependency on non-existent `ThemeProvider`
  - Lazy-loaded IP Management page for better code splitting
  - Reusable modal components
  - Consistent styling with Tailwind CSS

### Fixed

- **Server Group Update Bug**
  - Fixed issue where changing server group from "Remote" to "On-Premise" wasn't saving
  - Added missing `Group` property to `UpdateServerRequest` in `UpdateServer.cs`
  - Updated `ApplyPartialUpdate` method to handle group updates

- **Build Errors**
  - Fixed FastEndpoints method naming (`SendAsync` → `Send.OkAsync`)
  - Resolved TypeScript enum compatibility issues
  - Fixed missing import statements
  - Corrected API client method signatures

### Changed

- **Navigation Layout**
  - Grouped related menu items into logical categories
  - Moved Settings to right side of navigation bar
  - Reduced visual clutter in top menu
  - Improved scalability for future features

- **Code Organization**
  - Refactored IP Management API to use BaseApiClient pattern
  - Standardized component prop interfaces
  - Improved type safety across frontend codebase

## [0.0.2] - 2024-XX-XX

### Fixed
- Raspberry Pi Zero segmentation fault by disabling code trimming and single-file compression
- Update system compatibility with Pi Zero ARMv6 architecture
- Service restart handling during updates

### Added
- Comprehensive update system with version checking
- Update notification component
- Platform-specific download links
- Automatic update script (`update.sh`)
- Update settings page with release notes

## [0.0.1] - 2024-XX-XX

### Added
- Initial release
- Service monitoring and health checks
- Docker container integration
- Network discovery
- AI-powered log analysis with Ollama
- Server management
- Real-time monitoring dashboard
- Dark/light mode support

---

## Legend

- `Added` - New features
- `Changed` - Changes in existing functionality
- `Deprecated` - Soon-to-be removed features
- `Removed` - Removed features
- `Fixed` - Bug fixes
- `Security` - Vulnerability fixes

## Upcoming Features

See the [README.md](README.md#-upcoming-features) for a complete list of planned features and enhancements.
