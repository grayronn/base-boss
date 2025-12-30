import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as XLSX from "xlsx";

interface BulkUploadGamesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Coach {
  id: string;
  full_name: string | null;
  email: string;
}

interface ParsedGame {
  opponent: string;
  location: string;
  date: string;
  time: string;
  valid: boolean;
  error?: string;
}

const BulkUploadGamesDialog = ({ open, onOpenChange, onSuccess }: BulkUploadGamesDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState("");
  const [parsedGames, setParsedGames] = useState<ParsedGame[]>([]);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      fetchCoaches();
      resetForm();
    }
  }, [open]);

  const fetchCoaches = async () => {
    try {
      const { data: coachRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "coach");

      if (rolesError) throw rolesError;

      if (coachRoles && coachRoles.length > 0) {
        const coachIds = coachRoles.map(r => r.user_id);
        
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", coachIds);

        if (profilesError) throw profilesError;
        setCoaches(profiles || []);
      }
    } catch (error) {
      console.error("Error fetching coaches:", error);
      toast.error("Failed to load coaches");
    }
  };

  const resetForm = () => {
    setSelectedCoachId("");
    setParsedGames([]);
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const parseExcelDate = (value: any): { date: string; time: string } | null => {
    if (!value) return null;
    
    // If it's a number (Excel serial date)
    if (typeof value === "number") {
      const date = XLSX.SSF.parse_date_code(value);
      if (date) {
        const dateStr = `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
        const timeStr = `${String(date.H).padStart(2, "0")}:${String(date.M).padStart(2, "0")}`;
        return { date: dateStr, time: timeStr };
      }
    }
    
    // If it's a string, try to parse it
    if (typeof value === "string") {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        const dateStr = parsed.toISOString().split("T")[0];
        const timeStr = `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
        return { date: dateStr, time: timeStr };
      }
    }
    
    return null;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setUploading(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { raw: false, dateNF: "yyyy-mm-dd" });

      const games: ParsedGame[] = jsonData.map((row: any) => {
        const opponent = row.opponent || row.Opponent || row.OPPONENT || "";
        const location = row.location || row.Location || row.LOCATION || "";
        
        // Try to get date/time from various column names
        let dateValue = row.date || row.Date || row.DATE || row.game_date || row.GameDate || "";
        let timeValue = row.time || row.Time || row.TIME || row.game_time || row.GameTime || "18:00";
        
        // If there's a combined datetime column
        const dateTimeValue = row.datetime || row.DateTime || row.DATETIME || row.game_datetime || "";
        
        let parsedDate = dateValue;
        let parsedTime = timeValue;
        
        if (dateTimeValue) {
          const parsed = parseExcelDate(dateTimeValue);
          if (parsed) {
            parsedDate = parsed.date;
            parsedTime = parsed.time;
          }
        } else if (dateValue) {
          // Try to parse just the date
          const parsed = parseExcelDate(dateValue);
          if (parsed) {
            parsedDate = parsed.date;
            if (parsed.time !== "00:00") {
              parsedTime = parsed.time;
            }
          }
        }

        const errors: string[] = [];
        if (!opponent) errors.push("Missing opponent");
        if (!location) errors.push("Missing location");
        if (!parsedDate) errors.push("Missing/invalid date");

        return {
          opponent: opponent.toString().trim(),
          location: location.toString().trim(),
          date: parsedDate.toString(),
          time: parsedTime.toString() || "18:00",
          valid: errors.length === 0,
          error: errors.length > 0 ? errors.join(", ") : undefined
        };
      });

      setParsedGames(games);
      
      const validCount = games.filter(g => g.valid).length;
      const invalidCount = games.filter(g => !g.valid).length;
      
      if (invalidCount > 0) {
        toast.warning(`Parsed ${games.length} games: ${validCount} valid, ${invalidCount} have errors`);
      } else {
        toast.success(`Parsed ${games.length} games successfully`);
      }
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("Failed to parse Excel file");
      setParsedGames([]);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCoachId) {
      toast.error("Please select a coach");
      return;
    }

    const validGames = parsedGames.filter(g => g.valid);
    if (validGames.length === 0) {
      toast.error("No valid games to upload");
      return;
    }

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const game of validGames) {
        try {
          const gameDateTime = new Date(`${game.date}T${game.time}`);
          
          if (isNaN(gameDateTime.getTime())) {
            errorCount++;
            continue;
          }

          const { data: createdGame, error: gameError } = await supabase
            .from("games")
            .insert({
              coach_id: selectedCoachId,
              game_date: gameDateTime.toISOString(),
              location: game.location,
              opponent: game.opponent,
              status: "pending",
            })
            .select()
            .single();

          if (gameError) {
            errorCount++;
            continue;
          }

          const { error: requestError } = await supabase
            .from("umpire_requests")
            .insert({
              game_id: createdGame.id,
              coach_id: selectedCoachId,
              status: "pending",
            });

          if (requestError) {
            errorCount++;
          } else {
            successCount++;
          }
        } catch {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Created ${successCount} games successfully${errorCount > 0 ? `, ${errorCount} failed` : ""}`);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error("Failed to create any games");
      }
    } catch (error: any) {
      console.error("Error creating games:", error);
      toast.error("Failed to create games: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const validGamesCount = parsedGames.filter(g => g.valid).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Upload Games
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file (.xlsx, .xls) to create multiple games at once.
            Required columns: opponent, location, date. Optional: time (defaults to 18:00).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="coach">Assign to Coach</Label>
            <Select value={selectedCoachId} onValueChange={setSelectedCoachId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a coach for all games" />
              </SelectTrigger>
              <SelectContent>
                {coaches.map((coach) => (
                  <SelectItem key={coach.id} value={coach.id}>
                    {coach.full_name || coach.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Excel File</Label>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-upload"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-1"
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Parsing..." : fileName || "Choose Excel File"}
              </Button>
            </div>
          </div>

          {parsedGames.length > 0 && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Preview ({parsedGames.length} games)</Label>
                <div className="flex gap-2">
                  <Badge variant="default">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    {validGamesCount} valid
                  </Badge>
                  {parsedGames.length - validGamesCount > 0 && (
                    <Badge variant="destructive">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      {parsedGames.length - validGamesCount} errors
                    </Badge>
                  )}
                </div>
              </div>
              <ScrollArea className="h-[250px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Opponent</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedGames.map((game, index) => (
                      <TableRow key={index} className={!game.valid ? "bg-destructive/10" : ""}>
                        <TableCell>
                          {game.valid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <span className="flex items-center gap-1 text-destructive text-xs">
                              <AlertCircle className="h-4 w-4" />
                              {game.error}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{game.opponent || "-"}</TableCell>
                        <TableCell>{game.location || "-"}</TableCell>
                        <TableCell>{game.date || "-"}</TableCell>
                        <TableCell>{game.time || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || validGamesCount === 0 || !selectedCoachId}
          >
            {loading ? "Creating..." : `Create ${validGamesCount} Games`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUploadGamesDialog;
