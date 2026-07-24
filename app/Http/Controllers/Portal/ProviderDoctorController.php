<?php
namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Doctor;
use App\Models\DoctorSchedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProviderDoctorController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $hcp = $request->user()->hcp;
        if (!$hcp) return response()->json(['data' => []]);

        $doctors = Doctor::where('hcp_id', $hcp->id)->with('schedules')->get();

        return response()->json(['data' => $doctors]);
    }

    public function store(Request $request): JsonResponse
    {
        $hcp = $request->user()->hcp;
        if (!$hcp) return response()->json(['message' => 'No provider record'], 404);

        $request->validate(['name' => 'required|string|max:150', 'specialty' => 'required|string|max:100', 'qualification' => 'nullable|string|max:100']);

        $doctor = Doctor::create([
            'hcp_id' => $hcp->id, 'name' => $request->name,
            'specialty' => $request->specialty, 'qualification' => $request->qualification,
            'status' => 'active',
        ]);

        return response()->json(['data' => $doctor], 201);
    }

    public function setSchedule(Request $request, Doctor $doctor): JsonResponse
    {
        $hcp = $request->user()->hcp;
        if (!$hcp || $doctor->hcp_id !== $hcp->id) return response()->json(['message' => 'Not found'], 404);

        $request->validate([
            'slots' => 'required|array',
            'slots.*.day_of_week' => 'required|integer|min:0|max:6',
            'slots.*.start_time' => 'required',
            'slots.*.end_time' => 'required',
            'slots.*.slot_minutes' => 'nullable|integer|min:5|max:120',
        ]);

        $doctor->schedules()->delete();
        foreach ($request->slots as $s) {
            DoctorSchedule::create([
                'doctor_id' => $doctor->id,
                'day_of_week' => $s['day_of_week'],
                'start_time' => $s['start_time'],
                'end_time' => $s['end_time'],
                'slot_minutes' => $s['slot_minutes'] ?? 30,
            ]);
        }

        return response()->json(['message' => 'Schedule updated.']);
    }

    public function destroy(Request $request, Doctor $doctor): JsonResponse
    {
        $hcp = $request->user()->hcp;
        if (!$hcp || $doctor->hcp_id !== $hcp->id) return response()->json(['message' => 'Not found'], 404);
        $doctor->update(['status' => 'inactive']);
        return response()->json(['message' => 'Doctor deactivated.']);
    }
}
